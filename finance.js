export const SCHEMES = {
  MICRO: {
    id: 'micro',
    name: 'Micro Finance Scheme',
    cap: 125000,
    rate: 6.5,
    tenureYears: 3,
    moratoriumMonths: 3,
    minCost: 0,
    maxCost: 140000
  },
  TERM: {
    id: 'term',
    name: 'Term Loan Scheme',
    cap: 4500000,
    rate: 8.0,
    tenureYears: 7,
    moratoriumMonths: 6,
    minCost: 140001,
    maxCost: 5000000
  }
};

export function calculateSchemeEligibility(marginCapital) {
  const margin = Number(marginCapital) || 0;
  const projectCost = margin / 0.10;
  const rawLoan = projectCost * 0.90;

  let scheme = SCHEMES.TERM;
  let outOfRange = false;

  if (projectCost <= SCHEMES.MICRO.maxCost) {
    scheme = SCHEMES.MICRO;
  } else if (projectCost <= SCHEMES.TERM.maxCost) {
    scheme = SCHEMES.TERM;
  } else {
    scheme = SCHEMES.TERM;
    outOfRange = true;
  }

  const exceedsCap = rawLoan > scheme.cap;
  const eligibleLoan = exceedsCap ? scheme.cap : rawLoan;

  return {
    margin,
    projectCost: Math.round(projectCost),
    rawLoan: Math.round(rawLoan),
    loan: Math.round(eligibleLoan),
    scheme,
    exceedsCap,
    outOfRange
  };
}

export function calculateAmortization({
  principal,
  annualRatePct,
  tenureYears,
  moratoriumMonths = 0,
  frequency = 'monthly'
}) {
  const totalMonths = Math.round(tenureYears * 12);
  const repaymentMonths = Math.max(totalMonths - moratoriumMonths, 1);
  const periodsPerYear = frequency === 'quarterly' ? 4 : 12;
  const periodMonths = frequency === 'quarterly' ? 3 : 1;
  const numPeriods = Math.max(Math.round(repaymentMonths / periodMonths), 1);
  const periodRate = (annualRatePct / 100) / periodsPerYear;

  let emiPayment = 0;
  if (periodRate === 0) {
    emiPayment = principal / numPeriods;
  } else {
    emiPayment = (principal * periodRate * Math.pow(1 + periodRate, numPeriods)) /
      (Math.pow(1 + periodRate, numPeriods) - 1);
  }

  let balance = principal;
  const schedule = [];

  for (let i = 1; i <= numPeriods; i++) {
    const interest = balance * periodRate;
    let principalPaid = emiPayment - interest;

    if (i === numPeriods) {
      principalPaid = balance;
      emiPayment = principalPaid + interest;
    }

    balance = Math.max(balance - principalPaid, 0);

    schedule.push({
      period: i,
      principal: Math.round(principalPaid),
      interest: Math.round(interest),
      payment: Math.round(emiPayment),
      balance: Math.round(balance)
    });
  }

  const totalRepayment = schedule.reduce((sum, item) => sum + item.payment, 0);
  const totalInterest = schedule.reduce((sum, item) => sum + item.interest, 0);

  return {
    emi: Math.round(schedule[0]?.payment || 0),
    totalInterest: Math.round(totalInterest),
    totalRepayment: Math.round(totalRepayment),
    numPeriods,
    schedule
  };
}

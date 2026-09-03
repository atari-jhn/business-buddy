// src/utils/finance.js

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

/**
 * Calculates Project Cost, Loan Requirement, and matches government scheme based on 10% Margin
 * @param {number} marginCapital - Beneficiary contribution
 */
export function calculateSchemeEligibility(marginCapital) {
  const margin = Number(marginCapital) || 0;
  // Project Cost = Margin ÷ 10%
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

/**
 * Calculates accurate Amortization schedule incorporating moratorium & payment frequency
 */
export function calculateAmortization({
  principal,
  annualRatePct,
  tenureYears,
  moratoriumMonths = 0,
  frequency = 'monthly' // 'monthly' | 'quarterly'
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
// src/config/ai.js
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();
export const aiClient = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

  // src/utils/promptTemplates.js
export function buildFeasibilityPrompt({ category, village, district, state, marginCapital, radius }) {
  return `
You are the AI engine for GramVichaar (Rural Enterprise Advisory Platform).
Analyze the business feasibility for a rural enterprise with the following details:
- Business Category: ${category}
- Location: Village ${village}, District ${district}, State ${state}
- Market Radius: ${radius} km
- Available Margin Capital: ₹${marginCapital}
Return ONLY a valid JSON object matching this schema without markdown fences:
{
  "feasibilityScore": 78,
  "feasibilityStatus": "Promising",
  "marketReach": {
    "populationReach": 18400,
    "potentialCustomers": 2650,
    "nearbyMarkets": 4,
    "distributionPoints": 3
  },
  "opportunity": {
    "title": "Doorstep dairy & milk products delivery",
    "level": "HIGH",
    "points": [
      "Limited organized delivery / service providers nearby",
      "Existing, steady local demand",
      "Proximity to residential clusters",
      "Low direct competitor density in target radius"
    ]
  },
  "competitors": [
    { "name": "Local Vendor", "distance": "1.2 km", "price": "₹58", "strength": "Medium", "gap": "No home delivery" },
    { "name": "Village Co-op Booth", "distance": "2.8 km", "price": "₹55", "strength": "Low", "gap": "Limited stock hours" },
    { "name": "Town Dairy Shop", "distance": "6.5 km", "price": "₹62", "strength": "High", "gap": "Far from cluster" }
  ],
  "swot": {
    "strengths": ["Local customer access", "Family workforce", "Lower distribution distance"],
    "weaknesses": ["Limited initial capital", "Limited commercial experience"],
    "opportunities": ["Underserved households", "Digital payment adoption", "Subscription delivery"],
    "threats": ["Seasonal demand changes", "Feed price fluctuations"]
  },
  "risks": [
    { "title": "Supply chain disruption", "level": "high", "mitigation": "Maintain buffer stock & identify 2 alternate suppliers." },
    { "title": "Seasonal demand drop", "level": "med", "mitigation": "Diversify into value-added products like ghee and paneer." },
    { "title": "Single-buyer dependency", "level": "med", "mitigation": "Expand customer base across adjoining villages." }
  ],
  "pricing": {
    "competitorAvg": 60,
    "priceRange": "₹58–₹62",
    "recommendedPrice": 60
  }
}
`;
}
export function buildChatPrompt({ userMessage, language, context }) {
  return `
You are GramVichaar AI, a polite, expert advisory assistant for rural entrepreneurs in India.
Current User Context:
- State: ${context.state || 'Assam'}
- District: ${context.district || 'Kamrup'}
- Margin Capital: ₹${context.marginCapital || 100000}
- Business Interest: ${context.category || 'Dairy & Livestock'}
- Matched Scheme: ${context.schemeName || 'Term Loan Scheme'}
Language to answer in: ${language} (en=English, hi=Hindi, as=Assamese, bn=Bengali, ta=Tamil, te=Telugu, mr=Marathi, kn=Kannada).
Guidelines:
1. Explain that beneficiary margin is 10% and institutional loan covers 90%.
2. Always keep calculations grounded in local realities and financial rules.
3. Be supportive, concise, and encourage confident planning.
User Question: "${userMessage}"
`;
}
// src/controllers/auth.controller.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'gramvichaar-secret-key-2026';

export async function register(req, res) {
  try {
    const { fullName, mobile, password, state, district, block, gramPanchayat, village, preferredLang } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { mobile } });
    if (existingUser) {
      return res.status(400).json({ error: 'Mobile number is already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        fullName,
        mobile,
        passwordHash,
        state: state || 'Assam',
        district,
        block,
        gramPanchayat,
        village,
        preferredLang: preferredLang || 'en'
      }
    });

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    return res.status(201).json({ message: 'User registered successfully', token, user });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function login(req, res) {
  try {
    const { mobile, password } = req.body;
    const user = await prisma.user.findUnique({ where: { mobile } });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid mobile number or credentials' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ token, user });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function sendOtp(req, res) {
  try {
    const { mobile } = req.body;
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits

    await prisma.otpVerification.create({
      data: {
        mobile,
        otpCode: generatedOtp,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      }
    });

    // In production: send SMS via Fast2SMS / Twilio. For development/demo, log it:
    console.log(`[GramVichaar OTP] Code for ${mobile}: ${generatedOtp}`);

    return res.json({ message: 'OTP sent successfully', demoOtp: generatedOtp });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function verifyOtp(req, res) {
  try {
    const { mobile, otpCode } = req.body;
    const record = await prisma.otpVerification.findFirst({
      where: {
        mobile,
        otpCode,
        verified: false,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!record && otpCode !== '123456') { // Allow 123456 as master test OTP
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    if (record) {
      await prisma.otpVerification.update({ where: { id: record.id }, data: { verified: true } });
    }

    let user = await prisma.user.findUnique({ where: { mobile } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          mobile,
          fullName: 'Rural Entrepreneur',
          state: 'Assam'
        }
      });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ message: 'OTP verified', token, user });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function updateProfile(req, res) {
  try {
    const userId = req.user.id;
    const updated = await prisma.user.update({
      where: { id: userId },
      data: req.body
    });
    return res.json({ message: 'Profile updated', user: updated });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// src/controllers/scheme.controller.js
import { calculateSchemeEligibility, calculateAmortization } from '../utils/finance.js';

export function calculateScheme(req, res) {
  try {
    const { marginCapital } = req.body;
    if (marginCapital === undefined) {
      return res.status(400).json({ error: 'marginCapital is required' });
    }

    const result = calculateSchemeEligibility(Number(marginCapital));
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export function calculateEmi(req, res) {
  try {
    const { amount, rate, tenure, moratorium, frequency } = req.body;

    const result = calculateAmortization({
      principal: Number(amount) || 900000,
      annualRatePct: Number(rate) || 8.0,
      tenureYears: Number(tenure) || 7,
      moratoriumMonths: Number(moratorium) || 6,
      frequency: frequency || 'monthly'
    });

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}// src/controllers/scheme.controller.js
import { calculateSchemeEligibility, calculateAmortization } from '../utils/finance.js';

export function calculateScheme(req, res) {
  try {
    const { marginCapital } = req.body;
    if (marginCapital === undefined) {
      return res.status(400).json({ error: 'marginCapital is required' });
    }

    const result = calculateSchemeEligibility(Number(marginCapital));
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export function calculateEmi(req, res) {
  try {
    const { amount, rate, tenure, moratorium, frequency } = req.body;

    const result = calculateAmortization({
      principal: Number(amount) || 900000,
      annualRatePct: Number(rate) || 8.0,
      tenureYears: Number(tenure) || 7,
      moratoriumMonths: Number(moratorium) || 6,
      frequency: frequency || 'monthly'
    });

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}// src/controllers/assess.controller.js
import { PrismaClient } from '@prisma/client';
import { aiClient } from '../config/ai.js';
import { buildFeasibilityPrompt } from '../utils/promptTemplates.js';
import { calculateSchemeEligibility } from '../utils/finance.js';

const prisma = new PrismaClient();

// Fallback high-quality mock data if Gemini API key is not configured
function getFallbackFeasibility(category, radius) {
  return {
    feasibilityScore: 78,
    feasibilityStatus: "Promising",
    marketReach: {
      populationReach: radius === '10' ? 34200 : 18400,
      potentialCustomers: radius === '10' ? 4900 : 2650,
      nearbyMarkets: radius === '10' ? 7 : 4,
      distributionPoints: radius === '10' ? 6 : 3
    },
    opportunity: {
      title: `${category} local delivery & aggregation`,
      level: "HIGH",
      points: [
        "Limited organized service providers in target radius",
        "Steady local household demand throughout the year",
        "Proximity to consumer residential clusters",
        "Low direct competitor density"
      ]
    },
    competitors: [
      { name: "Local Micro-Vendor", distance: "1.2 km", price: "₹58", strength: "Medium", gap: "No home delivery" },
      { name: "Village Co-op Booth", distance: "2.8 km", price: "₹55", strength: "Low", gap: "Limited opening hours" },
      { name: "Town Commercial Supplier", distance: "6.5 km", price: "₹62", strength: "High", gap: "Far from rural cluster" }
    ],
    swot: {
      strengths: ["Direct customer touchpoints", "Family labor participation", "Low transit distance"],
      weaknesses: ["Modest startup capital", "Limited branding"],
      opportunities: ["Underserved households", "Digital UPI payments", "Direct consumer subscription"],
      threats: ["Input material inflation", "Seasonality peaks"]
    },
    risks: [
      { title: "Supply chain disruption", level: "high", mitigation: "Maintain buffer stock & keep 2 alternate suppliers." },
      { title: "Seasonal demand drop", level: "med", mitigation: "Diversify product offerings during low season." },
      { title: "Single buyer risk", level: "med", mitigation: "Expand customer reach to adjoining villages." }
    ],
    pricing: {
      competitorAvg: 60,
      priceRange: "₹58–₹62",
      recommendedPrice: 60
    }
  };
}

export async function analyzeFeasibility(req, res) {
  try {
    const { category, description, radius = 5, marginCapital = 100000, village, district, state } = req.body;
    const userId = req.user?.id;

    const finance = calculateSchemeEligibility(marginCapital);
    let aiReport = null;

    if (aiClient) {
      try {
        const prompt = buildFeasibilityPrompt({
          category,
          village: village || 'Sample Village',
          district: district || 'Kamrup',
          state: state || 'Assam',
          marginCapital,
          radius
        });

        const response = await aiClient.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: { responseMimeType: 'application/json' }
        });

        aiReport = JSON.parse(response.text.trim());
      } catch (aiErr) {
        console.warn('[Gemini AI Feasibility Fallback]', aiErr.message);
        aiReport = getFallbackFeasibility(category, radius);
      }
    } else {
      aiReport = getFallbackFeasibility(category, radius);
    }

    let savedAssessment = null;
    if (userId) {
      savedAssessment = await prisma.assessment.create({
        data: {
          userId,
          category,
          description,
          radiusKm: Number(radius),
          marginCapital: finance.margin,
          projectCost: finance.projectCost,
          loanRequired: finance.loan,
          matchedScheme: finance.scheme.name,
          feasibilityScore: aiReport.feasibilityScore,
          feasibilityStatus: aiReport.feasibilityStatus,
          marketReach: aiReport.marketReach,
          opportunity: aiReport.opportunity,
          competitors: aiReport.competitors,
          swot: aiReport.swot,
          risks: aiReport.risks,
          pricing: aiReport.pricing
        }
      });
    }

    return res.json({
      assessmentId: savedAssessment?.id || 'temp-id',
      finance,
      report: aiReport
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}// src/controllers/plan.controller.js
import PDFDocument from 'pdfkit';
import { calculateSchemeEligibility, calculateAmortization } from '../utils/finance.js';

export function generateBusinessPlan(req, res) {
  try {
    const { category, marginCapital, village = 'Sample Village', district = 'Kamrup', name = 'Entrepreneur' } = req.body;
    const finance = calculateSchemeEligibility(marginCapital || 100000);
    const emiData = calculateAmortization({
      principal: finance.loan,
      annualRatePct: finance.scheme.rate,
      tenureYears: finance.scheme.tenureYears,
      moratoriumMonths: finance.scheme.moratoriumMonths
    });

    const sections = {
      executiveSummary: `${name} proposes to establish a ${category} enterprise in ${village}, ${district}, with an estimated project cost of ₹${finance.projectCost.toLocaleString('en-IN')}, supported by ₹${finance.margin.toLocaleString('en-IN')} margin capital and an estimated loan of ₹${finance.loan.toLocaleString('en-IN')} under the ${finance.scheme.name}.`,
      marketAnalysis: `The area shows an estimated population reach of 18,400 with a potential customer base of 2,650 households across nearby gram panchayats.`,
      customerProfile: `Primary customers include local households, community kitchens, and small village retail shops.`,
      competitorAnalysis: `Approximately 3-5 unorganized local vendors operate nearby with key gaps in door-to-door delivery and reliable stock.`,
      productsAndServices: `High-quality ${category} products with hygienic packing and scheduled morning/evening deliveries.`,
      pricingStrategy: `Competitive pricing aligned with local market averages (approx ₹60/unit).`,
      startupCost: `Total estimated setup cost: ₹${finance.projectCost.toLocaleString('en-IN')}.`,
      workingCapital: `Allocated initial working capital: ₹1,80,000 for operations and inventory cycles.`,
      revenueProjection: `Projected monthly gross revenue scaling from Month 4 onwards following the setup phase.`,
      profitEstimate: `Operating margins expected between 18% - 24% after debt servicing.`,
      swot: `Strong local touchpoints, low transport overhead; risks mitigated via diversified customer base.`,
      riskAssessment: `Supply disruptions mitigated through localized multi-vendor supplier contracts.`,
      financingStructure: `10% Beneficiary Margin (₹${finance.margin.toLocaleString('en-IN')}) + 90% Institutional Loan (₹${finance.loan.toLocaleString('en-IN')}).`,
      repaymentPlan: `Indicative EMI: ₹${emiData.emi.toLocaleString('en-IN')}/month for ${finance.scheme.tenureYears} years with ${finance.scheme.moratoriumMonths} months moratorium.`,
      implementationRoadmap: `Months 1-3: Procurement & Setup. Months 4-6: Launch & customer onboarding. Month 7+: Steady-state operations & debt repayment.`
    };

    return res.json({
      title: `${category} Business Plan`,
      finance,
      emi: emiData.emi,
      sections
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export function exportPlanPdf(req, res) {
  try {
    const doc = new PDFDocument({ margin: 40 });
    const filename = `GramVichaar_Business_Plan.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    // PDF Header
    doc.fontSize(20).fillColor('#0B3558').text('GRAMVICHAAR', { align: 'center' });
    doc.fontSize(11).fillColor('#F2891E').text('AI-Powered Rural Enterprise Advisory Platform', { align: 'center' });
    doc.moveDown(1.5);

    doc.fontSize(16).fillColor('#082742').text('Enterprise Business Plan & Project Report');
    doc.moveDown(0.5);

    doc.fontSize(10).fillColor('#333333').text(`Generated Date: ${new Date().toLocaleDateString('en-IN')}`);
    doc.text(`Scheme Recommendation: Term Loan Scheme (8% p.a.)`);
    doc.moveDown(1);

    doc.rect(doc.x, doc.y, 515, 2).fill('#0B3558');
    doc.moveDown(1);

    const sections = req.body.sections || {};
    for (const [key, value] of Object.entries(sections)) {
      doc.fontSize(13).fillColor('#0B3558').text(key.replace(/([A-Z])/g, ' $1').toUpperCase());
      doc.fontSize(10).fillColor('#444444').text(value, { lineGap: 3 });
      doc.moveDown(1);
    }

    doc.end();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}// src/controllers/chat.controller.js
import { aiClient } from '../config/ai.js';
import { buildChatPrompt } from '../utils/promptTemplates.js';
import { calculateSchemeEligibility } from '../utils/finance.js';

export async function chatWithAdvisor(req, res) {
  try {
    const { message, language = 'en', userContext = {} } = req.body;
    const lower = (message || '').toLowerCase();

    // Fallback rule-based responses matching frontend logic
    const margin = userContext.marginCapital || 100000;
    const fin = calculateSchemeEligibility(margin);

    if (!aiClient) {
      if (lower.includes('margin')) {
        return res.json({
          reply: `Under GramVichaar's scheme logic, your margin contribution is 10% of the total project cost, and the remaining 90% is an institutional loan. For example, ₹${margin.toLocaleString('en-IN')} margin supports a project cost of ₹${fin.projectCost.toLocaleString('en-IN')}.`
        });
      }
      if (lower.includes('loan') || lower.includes('how much')) {
        return res.json({
          reply: `Based on your margin capital of ₹${margin.toLocaleString('en-IN')}, your estimated project cost is ₹${fin.projectCost.toLocaleString('en-IN')} and your eligible loan is ₹${fin.loan.toLocaleString('en-IN')} under the ${fin.scheme.name}.`
        });
      }
      return res.json({
        reply: `Namaste! GramVichaar AI is here to help you plan your business, understand loan schemes, and evaluate local demand in your village.`
      });
    }

    const prompt = buildChatPrompt({
      userMessage: message,
      language,
      context: { ...userContext, schemeName: fin.scheme.name }
    });

    const response = await aiClient.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt
    });

    return res.json({ reply: response.text.trim() });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}// src/controllers/admin.controller.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function getAdminMetrics(req, res) {
  try {
    // In production, aggregate from database:
    // const totalEntrepreneurs = await prisma.user.count({ where: { role: 'ENTREPRENEUR' } });
    
    return res.json({
      summary: {
        totalEntrepreneurs: 1248,
        assessmentsCompleted: 867,
        businessPlansGenerated: 642,
        schemeRecommendations: 531
      },
      categoryDemand: [
        { category: 'Dairy', count: 210 },
        { category: 'Agri', count: 175 },
        { category: 'Retail', count: 160 },
        { category: 'Textiles', count: 95 },
        { category: 'Fisheries', count: 60 },
        { category: 'Food', count: 140 },
        { category: 'Repair', count: 80 },
        { category: 'Transport', count: 55 },
        { category: 'Digital', count: 72 }
      ],
      districtAssessments: [
        { district: 'Kamrup', count: 240 },
        { district: 'Nagaon', count: 190 },
        { district: 'Barpeta', count: 160 },
        { district: 'Jorhat', count: 145 },
        { district: 'Sonitpur', count: 132 }
      ],
      schemeDistribution: {
        microFinance: 38,
        termLoan: 62
      },
      riskBreakdown: {
        high: 18,
        medium: 47,
        low: 35
      },
      avgCostByCategory: [
        { category: 'Dairy', avgCost: 850000 },
        { category: 'Agri', avgCost: 1120000 },
        { category: 'Retail', avgCost: 640000 },
        { category: 'Textiles', avgCost: 480000 },
        { category: 'Fisheries', avgCost: 720000 },
        { category: 'Food', avgCost: 590000 },
        { category: 'Repair', avgCost: 410000 },
        { category: 'Transport', avgCost: 980000 },
        { category: 'Digital', avgCost: 360000 }
      ]
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}// src/app.js
import express from 'express';
import cors from 'cors';

import { register, login, sendOtp, verifyOtp, updateProfile } from './controllers/auth.controller.js';
import { calculateScheme, calculateEmi } from './controllers/scheme.controller.js';
import { analyzeFeasibility } from './controllers/assess.controller.js';
import { generateBusinessPlan, exportPlanPdf } from './controllers/plan.controller.js';
import { chatWithAdvisor } from './controllers/chat.controller.js';
import { getAdminMetrics } from './controllers/admin.controller.js';

const app = express();
app.use(cors());
app.use(express.json());

// --- Auth Routes ---
app.post('/api/auth/register', register);
app.post('/api/auth/login', login);
app.post('/api/auth/otp/send', sendOtp);
app.post('/api/auth/otp/verify', verifyOtp);
app.put('/api/auth/profile', updateProfile);

// --- Scheme & Financial Calculations ---
app.post('/api/scheme/calculate', calculateScheme);
app.post('/api/emi/calculate', calculateEmi);

// --- Assessment & Feasibility AI ---
app.post('/api/assessment/analyze', analyzeFeasibility);

// --- Business Plan & Reports ---
app.post('/api/business-plan/generate', generateBusinessPlan);
app.post('/api/business-plan/export-pdf', exportPlanPdf);

// --- Multilingual AI Chat Advisor ---
app.post('/api/chat', chatWithAdvisor);

// --- Admin Analytics ---
app.get('/api/admin/metrics', getAdminMetrics);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

export default app;// src/server.js
import app from './app.js';

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 GramVichaar API running at http://localhost:${PORT}`);
});import { NextResponse } from 'next/server';
import { calculateSchemeEligibility } from '@/lib/finance';

export async function POST(request) {
  try {
    const body = await request.json();
    const result = calculateSchemeEligibility(body.marginCapital);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}import { NextResponse } from 'next/server';
import { calculateAmortization } from '@/lib/finance';

export async function POST(request) {
  try {
    const body = await request.json();
    const result = calculateAmortization({
      principal: Number(body.amount),
      annualRatePct: Number(body.rate),
      tenureYears: Number(body.tenure),
      moratoriumMonths: Number(body.moratorium),
      frequency: body.frequency || 'monthly'
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { buildFeasibilityPrompt } from '@/lib/promptTemplates';
import { calculateSchemeEligibility } from '@/lib/finance';

const aiClient = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

export async function POST(request) {
  try {
    const body = await request.json();
    const finance = calculateSchemeEligibility(body.marginCapital);

    if (aiClient) {
      const prompt = buildFeasibilityPrompt(body);
      const res = await aiClient.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });
      const report = JSON.parse(res.text.trim());
      return NextResponse.json({ finance, report });
    }

    // Default response if key isn't present
    return NextResponse.json({
      finance,
      report: {
        feasibilityScore: 78,
        feasibilityStatus: "Promising",
        marketReach: { populationReach: 18400, potentialCustomers: 2650, nearbyMarkets: 4, distributionPoints: 3 }
      }
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { buildChatPrompt } from '@/lib/promptTemplates';

const aiClient = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

export async function POST(request) {
  try {
    const { message, language = 'en', userContext = {} } = await request.json();

    if (!aiClient) {
      return NextResponse.json({
        reply: `Namaste! GramVichaar AI is ready. For your ₹${userContext.marginCapital || 100000} margin, your estimated project cost is ₹10,00,000 with a 90% loan under the Term Loan Scheme.`
      });
    }

    const prompt = buildChatPrompt({ userMessage: message, language, context: userContext });
    const response = await aiClient.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt
    });

    return NextResponse.json({ reply: response.text.trim() });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}const API_BASE = 'http://localhost:5000/api';

// 1. Calculate Scheme
async function computeFinanceAPI(marginCapital) {
  const res = await fetch(`${API_BASE}/scheme/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ marginCapital })
  });
  state.finance = await res.json();
  render();
}

// 2. AI Feasibility Analysis
async function analyzeBusinessAPI() {
  navigate('processing');
  runProcessingAnimation();
  
  const res = await fetch(`${API_BASE}/assessment/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      category: state.assessment.category,
      description: state.assessment.description,
      radius: state.assessment.radius,
      marginCapital: state.user.marginCapital,
      village: state.user.village,
      district: state.user.district,
      state: state.user.state
    })
  });
  const data = await res.json();
  // Update state with AI-generated report data
  console.log('AI Feasibility generated:', data);
}

// 3. Send AI Chat
async function sendChatAPI(text) {
  state.chatMessages.push({ from: 'user', text });
  renderChat();

  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: text,
      language: state.lang,
      userContext: {
        marginCapital: state.user.marginCapital,
        district: state.user.district,
        category: state.assessment.category
      }
    })
  });
  const data = await res.json();
  state.chatMessages.push({ from: 'bot', text: data.reply });
  renderChat();
}
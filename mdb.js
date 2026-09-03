// src/models/User.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    mobile: {
      type: String,
      required: [true, 'Mobile number is required'],
      unique: true,
      trim: true,
      match: [/^[6-9]\d{9}$/, 'Please provide a valid 10-digit Indian mobile number'],
      index: true
    },
    passwordHash: {
      type: String,
      select: false // Excluded from default query results for security
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: null
    },
    preferredLang: {
      type: String,
      enum: ['en', 'hi', 'as', 'bn', 'ta', 'te', 'mr', 'kn'],
      default: 'en'
    },
    role: {
      type: String,
      enum: ['entrepreneur', 'admin'],
      default: 'entrepreneur',
      index: true
    },

    // Geographic Profile
    location: {
      state: { type: String, default: 'Assam', trim: true, index: true },
      district: { type: String, default: 'Kamrup', trim: true, index: true },
      block: { type: String, default: 'Rani', trim: true },
      gramPanchayat: { type: String, default: 'Sample Gram Panchayat', trim: true },
      village: { type: String, default: 'Sample Village', trim: true },
      pinCode: { type: String, match: [/^\d{6}$/, 'PIN code must be 6 digits'] }
    },

    // Demographics & Experience
    demographics: {
      age: { type: Number, min: 18, max: 100 },
      education: { type: String, trim: true },
      previousExperience: { type: String, default: 'None' },
      existingBusiness: { type: String, default: 'No' },
      familyMembersInvolved: { type: Number, min: 1, default: 1 }
    },

    // Financial Capacity
    financialCapacity: {
      marginCapital: {
        type: Number,
        required: true,
        min: [5000, 'Margin capital must be at least ₹5,000'],
        default: 100000
      },
      businessInterest: {
        type: String,
        enum: [
          'Dairy & Livestock',
          'Agriculture & Food Processing',
          'Retail',
          'Textiles & Handicrafts',
          'Fisheries',
          'Food & Catering',
          'Repair & Services',
          'Transport & Logistics',
          'Digital Services',
          'Other'
        ],
        default: 'Dairy & Livestock',
        index: true
      }
    },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date }
  },
  {
    timestamps: true
  }
);

// Compound index for admin filtering
UserSchema.index({ 'location.state': 1, 'location.district': 1, 'financialCapacity.businessInterest': 1 });

UserSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

export const User = mongoose.models.User || mongoose.model('User', UserSchema);

// src/models/OtpVerification.js
import mongoose from 'mongoose';

const OtpVerificationSchema = new mongoose.Schema(
  {
    mobile: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    otpCode: {
      type: String,
      required: true,
      trim: true
    },
    verified: {
      type: Boolean,
      default: false
    },
    attempts: {
      type: Number,
      default: 0,
      max: 5
    },
    expiresAt: {
      type: Date,
      required: true,
      // Automatic TTL Index: MongoDB automatically purges this document on expiry
      index: { expires: '0s' }
    }
  },
  {
    timestamps: true
  }
);

export const OtpVerification = mongoose.models.OtpVerification || mongoose.model('OtpVerification', OtpVerificationSchema);

// src/models/Assessment.js
import mongoose from 'mongoose';

const CompetitorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    distance: { type: String, required: true }, // e.g. "1.2 km"
    price: { type: String, required: true },    // e.g. "₹58"
    strength: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
    gap: { type: String, required: true }       // e.g. "No home delivery"
  },
  { _id: false }
);

const RiskItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    level: { type: String, enum: ['high', 'med', 'low'], required: true },
    mitigation: { type: String, required: true }
  },
  { _id: false }
);

const AssessmentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    category: {
      type: String,
      required: true,
      index: true
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000
    },
    radiusKm: {
      type: Number,
      enum: [5, 10],
      default: 5
    },

    locationSnapshot: {
      state: { type: String, default: 'Assam' },
      district: { type: String, default: 'Kamrup', index: true },
      block: { type: String, default: 'Rani' },
      gramPanchayat: { type: String, default: 'Sample Gram Panchayat' },
      village: { type: String, default: 'Sample Village' },
      pinCode: { type: String }
    },

    // 1. Feasibility Score
    feasibilityScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 78
    },
    feasibilityStatus: {
      type: String,
      enum: ['Promising', 'Moderate', 'High Risk', 'Viable'],
      default: 'Promising'
    },

    // 2. Local Market Reach
    marketReach: {
      populationReach: { type: Number, default: 18400 },
      potentialCustomers: { type: Number, default: 2650 },
      nearbyMarkets: { type: Number, default: 4 },
      distributionPoints: { type: Number, default: 3 }
    },

    // 3. Opportunity
    opportunity: {
      title: { type: String, default: 'Doorstep dairy delivery & fresh aggregation' },
      level: { type: String, enum: ['HIGH', 'MEDIUM', 'LOW'], default: 'HIGH' },
      points: [{ type: String }]
    },

    // 4. Competitor Analysis
    competitors: [CompetitorSchema],

    // 5. SWOT Analysis
    swot: {
      strengths: [{ type: String }],
      weaknesses: [{ type: String }],
      opportunities: [{ type: String }],
      threats: [{ type: String }]
    },

    // 6. Risk Assessment
    risks: [RiskItemSchema],

    // 7. Recommended Market Pricing
    pricing: {
      competitorAvg: { type: Number, default: 60 },
      priceRange: { type: String, default: '₹58–₹62' },
      recommendedPrice: { type: Number, default: 60 }
    },

    // Financial Analysis Snapshot (10% Margin Logic)
    financials: {
      marginCapital: { type: Number, required: true },
      projectCost: { type: Number, required: true },
      loanRequired: { type: Number, required: true },
      schemeMatched: {
        id: { type: String },
        name: { type: String },
        rate: { type: Number },
        tenureYears: { type: Number },
        moratoriumMonths: { type: Number },
        maxFundingCap: { type: Number }
      },
      exceedsCap: { type: Boolean, default: false },
      outOfRange: { type: Boolean, default: false }
    }
  },
  {
    timestamps: true
  }
);

AssessmentSchema.index({ 'locationSnapshot.district': 1, category: 1, createdAt: -1 });

export const Assessment = mongoose.models.Assessment || mongoose.model('Assessment', AssessmentSchema);

// src/models/Scheme.js
import mongoose from 'mongoose';

const SchemeSchema = new mongoose.Schema(
  {
    schemeCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    minProjectCost: {
      type: Number,
      default: 0
    },
    maxProjectCost: {
      type: Number,
      required: true
    },
    maxLoanCap: {
      type: Number,
      required: true
    },
    interestRatePct: {
      type: Number,
      required: true // e.g. 6.5 or 8.0
    },
    tenureYears: {
      type: Number,
      required: true // e.g. 3 or 7
    },
    moratoriumMonths: {
      type: Number,
      default: 0 // e.g. 3 or 6
    },
    marginRequirementPct: {
      type: Number,
      default: 10 // 10%
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

export const Scheme = mongoose.models.Scheme || mongoose.model('Scheme', SchemeSchema);

// src/models/CostPlanner.js
import mongoose from 'mongoose';

const CostItemSchema = new mongoose.Schema(
  {
    category: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0, default: 0 }
  },
  { _id: false }
);

const CostPlannerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    assessment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assessment'
    },
    items: {
      type: [CostItemSchema],
      default: [
        { category: 'Infrastructure', amount: 250000 },
        { category: 'Equipment', amount: 300000 },
        { category: 'Raw Materials', amount: 150000 },
        { category: 'Working Capital', amount: 180000 },
        { category: 'Marketing', amount: 40000 },
        { category: 'Transportation', amount: 50000 },
        { category: 'Licensing', amount: 15000 },
        { category: 'Emergency Reserve', amount: 15000 }
      ]
    },
    currency: { type: String, default: 'INR' }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual property to calculate total project cost
CostPlannerSchema.virtual('totalProjectCost').get(function () {
  if (!this.items || !this.items.length) return 0;
  return this.items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
});

export const CostPlanner = mongoose.models.CostPlanner || mongoose.model('CostPlanner', CostPlannerSchema);

// src/models/BusinessPlan.js
import mongoose from 'mongoose';

const BusinessPlanSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    assessment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assessment'
    },
    title: { type: String, required: true },
    category: { type: String, required: true },
    
    financialSummary: {
      marginCapital: { type: Number, required: true },
      projectCost: { type: Number, required: true },
      loanAmount: { type: Number, required: true },
      schemeName: { type: String, required: true },
      interestRate: { type: Number, required: true },
      tenureYears: { type: Number, required: true },
      moratoriumMonths: { type: Number, default: 0 },
      estimatedEmi: { type: Number, required: true }
    },

    // 15 Standard Sections
    sections: {
      executiveSummary: { type: String, required: true },
      marketAnalysis: { type: String, required: true },
      customerProfile: { type: String, required: true },
      competition: { type: String, required: true },
      productsAndServices: { type: String, required: true },
      pricingStrategy: { type: String, required: true },
      startupCost: { type: String, required: true },
      workingCapital: { type: String, required: true },
      revenueProjection: { type: String, required: true },
      profitEstimate: { type: String, required: true },
      swot: { type: String, required: true },
      riskAssessment: { type: String, required: true },
      financingStructure: { type: String, required: true },
      repaymentPlan: { type: String, required: true },
      implementationRoadmap: { type: String, required: true }
    },

    status: {
      type: String,
      enum: ['draft', 'generated', 'finalized', 'submitted'],
      default: 'generated'
    },
    pdfExportMetadata: {
      generatedAt: { type: Date },
      downloadCount: { type: Number, default: 0 }
    }
  },
  {
    timestamps: true
  }
);

export const BusinessPlan = mongoose.models.BusinessPlan || mongoose.model('BusinessPlan', BusinessPlanSchema);

// src/models/ChatSession.js
import mongoose from 'mongoose';

const ChatSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      default: null
    },
    sessionId: {
      type: String,
      unique: true,
      required: true,
      index: true
    },
    language: {
      type: String,
      enum: ['en', 'hi', 'as', 'bn', 'ta', 'te', 'mr', 'kn'],
      default: 'en'
    },
    messages: [
      {
        from: { type: String, enum: ['user', 'bot', 'system'], required: true },
        text: { type: String, required: true },
        timestamp: { type: Date, default: Date.now }
      }
    ],
    userContextSnapshot: {
      state: { type: String },
      district: { type: String },
      marginCapital: { type: Number },
      category: { type: String },
      matchedScheme: { type: String }
    }
  },
  {
    timestamps: true
  }
);

export const ChatSession = mongoose.models.ChatSession || mongoose.model('ChatSession', ChatSessionSchema);

// src/config/db.js
import mongoose from 'mongoose';

export async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/gramvichaar';
  
  try {
    const conn = await mongoose.connect(uri, {
      autoIndex: true, // Builds schema indexes on startup
      serverSelectionTimeoutMS: 5000
    });
    console.log(`🍃 MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.warn(`⚠️ MongoDB Connection Error (${error.message}). Running in fallback mode.`);
  }
}
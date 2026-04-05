/**
 * Career Insights Data
 * Static career market information for all 18 Discovery career paths.
 * Includes job market demand, salary ranges, common job titles, and required skills.
 */

export interface CareerInsightsData {
  job_market: {
    demand: string;
    growth_rate: string;
    salary_range: string;
    job_titles: string[];
  };
  required_skills: {
    technical: string[];
    soft: string[];
  };
}

export const CAREER_INSIGHTS: Record<string, CareerInsightsData> = {
  app_developer: {
    job_market: {
      demand: "極高",
      growth_rate: "+25% (2024-2028)",
      salary_range: "NT$600,000 – NT$1,800,000 / 年",
      job_titles: ["App Developer", "Mobile Engineer", "iOS/Android Developer", "Full-Stack Developer"],
    },
    required_skills: {
      technical: ["Swift / Kotlin", "React Native", "REST API", "Git", "UI/UX 基礎"],
      soft: ["問題解決", "持續學習", "使用者同理心", "溝通協作"],
    },
  },

  game_designer: {
    job_market: {
      demand: "高",
      growth_rate: "+18% (2024-2028)",
      salary_range: "NT$480,000 – NT$1,400,000 / 年",
      job_titles: ["Game Designer", "Level Designer", "Game Producer", "Narrative Designer"],
    },
    required_skills: {
      technical: ["Unity / Unreal Engine", "C# / Blueprint", "3D 建模基礎", "遊戲平衡設計", "Prototyping"],
      soft: ["創意思維", "玩家心理洞察", "迭代設計", "跨團隊合作"],
    },
  },

  content_creator: {
    job_market: {
      demand: "高",
      growth_rate: "+30% (2024-2028)",
      salary_range: "NT$360,000 – NT$2,400,000 / 年 (含業配收入)",
      job_titles: ["Content Creator", "Digital Creator", "Brand Storyteller", "Content Strategist"],
    },
    required_skills: {
      technical: ["影片剪輯 (Premiere / DaVinci)", "SEO / 演算法", "社群平台分析", "攝影攝像"],
      soft: ["說故事能力", "觀眾洞察", "持續創作力", "品牌經營"],
    },
  },

  youtuber: {
    job_market: {
      demand: "高",
      growth_rate: "+28% (2024-2028)",
      salary_range: "NT$240,000 – NT$3,600,000 / 年 (依頻道規模)",
      job_titles: ["YouTuber", "Video Creator", "Channel Manager", "Content Producer"],
    },
    required_skills: {
      technical: ["YouTube Studio", "影片剪輯", "縮圖設計", "SEO 優化", "數據分析"],
      soft: ["鏡頭感", "口語表達", "觀眾互動", "自我行銷"],
    },
  },

  data_analyst: {
    job_market: {
      demand: "極高",
      growth_rate: "+35% (2024-2028)",
      salary_range: "NT$720,000 – NT$2,000,000 / 年",
      job_titles: ["Data Analyst", "Business Intelligence Analyst", "Data Scientist", "Analytics Engineer"],
    },
    required_skills: {
      technical: ["Python / R", "SQL", "Tableau / Power BI", "統計分析", "機器學習基礎"],
      soft: ["數據說故事", "商業洞察", "批判性思維", "跨部門溝通"],
    },
  },

  ux_designer: {
    job_market: {
      demand: "高",
      growth_rate: "+22% (2024-2028)",
      salary_range: "NT$600,000 – NT$1,600,000 / 年",
      job_titles: ["UX Designer", "Product Designer", "UI/UX Designer", "Interaction Designer"],
    },
    required_skills: {
      technical: ["Figma / Sketch", "Prototyping", "使用者研究", "Usability Testing", "Design System"],
      soft: ["同理心", "設計思考", "清晰溝通", "反覆迭代"],
    },
  },

  tech_entrepreneur: {
    job_market: {
      demand: "高",
      growth_rate: "+20% (2024-2028)",
      salary_range: "NT$0 – NT$無上限 (依創業成果)",
      job_titles: ["Tech Entrepreneur", "Co-Founder", "CTO", "Startup CEO"],
    },
    required_skills: {
      technical: ["產品開發", "技術架構評估", "數據決策", "Fundraising 基礎"],
      soft: ["領導力", "風險承擔", "快速學習", "韌性"],
    },
  },

  startup_founder: {
    job_market: {
      demand: "高",
      growth_rate: "+20% (2024-2028)",
      salary_range: "NT$0 – NT$無上限 (依創業成果)",
      job_titles: ["Startup Founder", "CEO", "Co-Founder", "Entrepreneur"],
    },
    required_skills: {
      technical: ["商業模式設計", "募資 Pitch", "產品開發基礎", "市場分析"],
      soft: ["願景塑造", "說服力", "執行力", "抗壓性"],
    },
  },

  cybersecurity_specialist: {
    job_market: {
      demand: "極高",
      growth_rate: "+33% (2024-2028)",
      salary_range: "NT$720,000 – NT$2,400,000 / 年",
      job_titles: ["Cybersecurity Analyst", "Penetration Tester", "Security Engineer", "SOC Analyst"],
    },
    required_skills: {
      technical: ["網路協定", "滲透測試", "SIEM 工具", "密碼學", "Linux / Windows 安全"],
      soft: ["分析思維", "道德判斷", "持續學習", "危機處理"],
    },
  },

  product_manager: {
    job_market: {
      demand: "極高",
      growth_rate: "+28% (2024-2028)",
      salary_range: "NT$840,000 – NT$2,400,000 / 年",
      job_titles: ["Product Manager", "Senior PM", "Product Lead", "Group PM"],
    },
    required_skills: {
      technical: ["產品 Roadmap", "數據分析 (SQL/GA)", "A/B Testing", "用戶研究", "Agile / Scrum"],
      soft: ["影響力", "優先順序判斷", "跨功能溝通", "客戶洞察"],
    },
  },

  biotech_researcher: {
    job_market: {
      demand: "高",
      growth_rate: "+22% (2024-2028)",
      salary_range: "NT$600,000 – NT$1,800,000 / 年",
      job_titles: ["Biotech Researcher", "Research Scientist", "Bioinformatics Analyst", "Clinical Research Associate"],
    },
    required_skills: {
      technical: ["分子生物學", "生物資訊學", "實驗設計", "統計分析", "Python 基礎"],
      soft: ["嚴謹思維", "耐心", "科學倫理", "跨領域協作"],
    },
  },

  environmental_scientist: {
    job_market: {
      demand: "高",
      growth_rate: "+25% (2024-2028)",
      salary_range: "NT$480,000 – NT$1,400,000 / 年",
      job_titles: ["Environmental Scientist", "Sustainability Analyst", "Climate Researcher", "Environmental Consultant"],
    },
    required_skills: {
      technical: ["GIS / 遙測", "環境監測技術", "數據分析", "法規了解", "碳盤查"],
      soft: ["系統思維", "使命感", "報告撰寫", "跨部門溝通"],
    },
  },

  autonomous_vehicle_engineer: {
    job_market: {
      demand: "極高",
      growth_rate: "+40% (2024-2028)",
      salary_range: "NT$1,200,000 – NT$3,600,000 / 年",
      job_titles: ["Autonomous Vehicle Engineer", "Robotics Engineer", "Perception Engineer", "ADAS Engineer"],
    },
    required_skills: {
      technical: ["ROS / ROS2", "電腦視覺", "感測器融合", "C++ / Python", "深度學習"],
      soft: ["安全意識", "系統思維", "跨團隊合作", "快速迭代"],
    },
  },

  robotics_engineer: {
    job_market: {
      demand: "高",
      growth_rate: "+35% (2024-2028)",
      salary_range: "NT$840,000 – NT$2,400,000 / 年",
      job_titles: ["Robotics Engineer", "Mechatronics Engineer", "Controls Engineer", "Automation Engineer"],
    },
    required_skills: {
      technical: ["ROS", "機械設計", "電控系統", "C++ / Python", "嵌入式系統"],
      soft: ["問題解決", "創新思維", "實驗精神", "跨域整合"],
    },
  },

  green_energy_engineer: {
    job_market: {
      demand: "極高",
      growth_rate: "+38% (2024-2028)",
      salary_range: "NT$720,000 – NT$2,000,000 / 年",
      job_titles: ["Green Energy Engineer", "Renewable Energy Analyst", "Solar/Wind Engineer", "Energy Storage Engineer"],
    },
    required_skills: {
      technical: ["電力系統", "太陽能 / 風能設計", "儲能系統", "SCADA", "能源法規"],
      soft: ["永續思維", "跨域整合", "專案管理", "數據解讀"],
    },
  },

  ic_design_engineer: {
    job_market: {
      demand: "極高",
      growth_rate: "+30% (2024-2028)",
      salary_range: "NT$1,200,000 – NT$4,000,000 / 年",
      job_titles: ["IC Design Engineer", "RTL Designer", "Verification Engineer", "Physical Design Engineer"],
    },
    required_skills: {
      technical: ["Verilog / VHDL", "VLSI 設計", "EDA 工具", "類比電路", "晶片驗證"],
      soft: ["細心嚴謹", "邏輯思維", "長期專注", "團隊協作"],
    },
  },

  quantum_engineer: {
    job_market: {
      demand: "高",
      growth_rate: "+45% (2024-2028)",
      salary_range: "NT$1,440,000 – NT$4,800,000 / 年",
      job_titles: ["Quantum Engineer", "Quantum Software Developer", "Quantum Researcher", "Quantum Algorithm Engineer"],
    },
    required_skills: {
      technical: ["量子計算理論", "Qiskit / Cirq", "線性代數", "量子演算法", "Python"],
      soft: ["抽象思維", "研究耐心", "跨域學習", "創新突破"],
    },
  },

  smart_manufacturing_engineer: {
    job_market: {
      demand: "高",
      growth_rate: "+28% (2024-2028)",
      salary_range: "NT$720,000 – NT$1,800,000 / 年",
      job_titles: ["Smart Manufacturing Engineer", "Industry 4.0 Specialist", "Manufacturing Data Analyst", "IIoT Engineer"],
    },
    required_skills: {
      technical: ["IIoT 平台", "PLC / SCADA", "製造數據分析", "數位雙生", "AI 品質檢測"],
      soft: ["流程優化思維", "跨廠協作", "持續改善", "數據導向決策"],
    },
  },
};

/**
 * Get career insights for a given career type.
 * Returns null if no data is available.
 */
export function getCareerInsights(careerType: string): CareerInsightsData | null {
  return CAREER_INSIGHTS[careerType] ?? null;
}

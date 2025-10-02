import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = process.env.REACT_APP_GEMINI_API_KEY || 'AIzaSyDpewH4MoD8nBpKkyXEeHiGpYfINvSg-vY';
const genAI = new GoogleGenerativeAI(API_KEY);

const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

const SYSTEM_PROMPTS = {
  greeks: `Bạn là chuyên gia phân tích Options Greeks cho thị trường chứng khoán Việt Nam. 
Nhiệm vụ của bạn là giải thích các chỉ số Greeks (Delta, Gamma, Vega, Theta, Rho), công thức tính toán, 
và ý nghĩa thực tế của chúng trong giao dịch covered warrants. Trả lời bằng tiếng Việt, dễ hiểu.`,

  hedging: `Bạn là chuyên gia về Delta Hedging và quản lý rủi ro cho covered warrants tại Việt Nam.
Giải thích các chiến lược hedging, rebalancing, chi phí giao dịch. Trả lời bằng tiếng Việt.`,

  risk: `Bạn là chuyên gia quản lý rủi ro tài chính, chuyên về VaR, CVaR, Stress Testing, Monte Carlo.
Giải thích các phương pháp đo lường rủi ro. Trả lời bằng tiếng Việt.`,

  volatility: `Bạn là chuyên gia về Implied Volatility và Volatility Surface.
Giải thích implied volatility, volatility smile/skew. Trả lời bằng tiếng Việt.`,

  pricing: `Bạn là chuyên gia định giá options, am hiểu Black-Scholes, Heston model.
Giải thích công thức định giá và các giả định. Trả lời bằng tiếng Việt.`,

  default: `Bạn là chuyên gia tài chính định lượng, chuyên về covered warrants Việt Nam.
Giải thích các khái niệm tài chính một cách dễ hiểu. Trả lời bằng tiếng Việt.`
};

export const createChatSession = (context = 'default') => ({
  systemPrompt: SYSTEM_PROMPTS[context] || SYSTEM_PROMPTS.default,
  history: []
});

export const sendMessage = async (session, message) => {
  try {
    const chat = model.startChat({
      history: session.history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }]
      }))
    });

    const result = await chat.sendMessage(message);
    const response = result.response.text();

    session.history.push({ role: 'user', content: message });
    session.history.push({ role: 'model', content: response });

    return response;
  } catch (error) {
    throw new Error('Không thể kết nối với AI.');
  }
};

export const getSuggestions = (context) => {
  const suggestions = {
    greeks: [
      'Delta là gì và ý nghĩa của nó?',
      'Giải thích Gamma và tại sao nó quan trọng?',
      'Vega ảnh hưởng thế nào đến giá warrant?',
      'Theta decay hoạt động như thế nào?'
    ],
    hedging: [
      'Delta hedging là gì?',
      'Khi nào nên rebalance hedge position?',
      'Chi phí giao dịch ảnh hưởng thế nào?',
      'P&L của delta hedging được tính như thế nào?'
    ],
    risk: [
      'VaR là gì và cách tính?',
      'Stress testing hoạt động thế nào?',
      'Monte Carlo simulation dùng để làm gì?',
      'CVaR khác gì với VaR?'
    ],
    volatility: [
      'Implied volatility là gì?',
      'Volatility smile/skew nghĩa là gì?',
      'Làm sao calibrate volatility surface?',
      'Historical vs Implied volatility?'
    ],
    pricing: [
      'Black-Scholes model hoạt động thế nào?',
      'Heston model khác gì Black-Scholes?',
      'Các giả định của Black-Scholes là gì?',
      'Cách định giá warrant at-the-money?'
    ],
    default: [
      'Covered warrant là gì?',
      'Giải thích moneyness (ITM, ATM, OTM)?',
      'Strike price ảnh hưởng thế nào đến giá?',
      'Time to maturity quan trọng như thế nào?'
    ]
  };
  return suggestions[context] || suggestions.default;
};

export const getContextFromPath = (pathname) => {
  if (pathname.includes('greeks')) return 'greeks';
  if (pathname.includes('hedging')) return 'hedging';
  if (pathname.includes('risk')) return 'risk';
  return 'default';
};

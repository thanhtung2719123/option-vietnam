"""
🎯 COMPREHENSIVE DEMO: All Risk Management Fixes
Demonstrates all improvements from Phase 1 & 2
"""
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

import numpy as np

# Direct imports to avoid __init__.py issues
import importlib.util
spec1 = importlib.util.spec_from_file_location("monte_carlo", "backend/services/risk_services/monte_carlo_risk_engine.py")
mc_module = importlib.util.module_from_spec(spec1)
spec1.loader.exec_module(mc_module)
MonteCarloRiskEngine = mc_module.MonteCarloRiskEngine

spec2 = importlib.util.spec_from_file_location("second_order", "backend/services/greeks_services/second_order_greeks.py")
greeks_module = importlib.util.module_from_spec(spec2)
spec2.loader.exec_module(greeks_module)
SecondOrderGreeksCalculator = greeks_module.SecondOrderGreeksCalculator

print("=" * 80)
print("🎯 VIETNAMESE WARRANT RISK MANAGEMENT - COMPREHENSIVE DEMO")
print("=" * 80)

# ============================================================================
# PART 1: VALUE AT RISK (VaR) ANALYSIS
# ============================================================================
print("\n" + "=" * 80)
print("📊 PART 1: VALUE AT RISK (VaR) ANALYSIS")
print("=" * 80)

engine = MonteCarloRiskEngine(num_simulations=10000)
portfolio_value = 1000000000  # 1 billion VND

print("\n🔷 Scenario: Vietnamese warrant portfolio worth 1 billion VND")
print("   Confidence level: 95%")
print("   Time horizon: 1 day")

# Test all three methods
methods = ['historical', 'parametric', 'monte_carlo']
print("\n📈 Comparing VaR calculation methods:\n")

for method in methods:
    result = engine.calculate_var(
        symbols=['CVNM2501', 'CHPG2502'],
        confidence_level=0.95,
        time_horizon=1,
        method=method
    )
    
    var_vnd = result['var_value'] * portfolio_value
    cvar_vnd = result['expected_shortfall'] * portfolio_value
    
    print(f"   {method.upper():15} | VaR: {var_vnd:>15,.0f} VND | CVaR: {cvar_vnd:>15,.0f} VND")
    print(f"                   | ({result['var_value']*100:.2f}%)         | ({result['expected_shortfall']*100:.2f}%)")

print("\n💡 Interpretation:")
print("   - Historical VaR uses actual market returns (best for fat-tailed distributions)")
print("   - Parametric VaR assumes normal distribution (fastest but less accurate)")
print("   - Monte Carlo VaR uses simulations (flexible and accurate)")
print("   - CVaR (Expected Shortfall) > VaR: average loss when VaR is exceeded")

# ============================================================================
# PART 2: STRESS TESTING
# ============================================================================
print("\n" + "=" * 80)
print("⚠️  PART 2: STRESS TESTING")
print("=" * 80)

stress_scenarios = [
    {'name': 'Normal Market', 'price_shock': 0, 'vol_shock': 1.0},
    {'name': 'Minor Correction (-5%)', 'price_shock': -0.05, 'vol_shock': 1.1},
    {'name': 'Market Correction (-10%)', 'price_shock': -0.10, 'vol_shock': 1.3},
    {'name': 'Flash Crash (-15%)', 'price_shock': -0.15, 'vol_shock': 2.0},
    {'name': 'Market Crash (-30%)', 'price_shock': -0.30, 'vol_shock': 1.5},
]

stress_result = engine.stress_test(
    symbols=['CVNM2501', 'CHPG2502'],
    stress_scenarios=stress_scenarios,
    base_portfolio_value=portfolio_value
)

print("\n📉 Stress Test Results:\n")
print(f"{'Scenario':<30} {'Portfolio Value':>20} {'Loss':>15} {'Loss %':>10}")
print("-" * 80)

for result in stress_result['stress_results']:
    print(f"{result['scenario_name']:<30} {result['portfolio_value']:>20,.0f} "
          f"{result['loss']:>15,.0f} {result['loss_pct']:>9.2f}%")

print(f"\n🚨 Worst Case: {stress_result['worst_case_scenario']['scenario_name']}")
print(f"   Loss: {stress_result['worst_case_scenario']['loss']:,.0f} VND "
      f"({stress_result['worst_case_scenario']['loss_pct']:.2f}%)")
print(f"\n💡 Recommendation: {stress_result['recommendations']['recommended_action']}")

# ============================================================================
# PART 3: SECOND-ORDER GREEKS (VANNA & VOLGA)
# ============================================================================
print("\n" + "=" * 80)
print("🔬 PART 3: SECOND-ORDER GREEKS - Vanna & Volga")
print("=" * 80)

calc = SecondOrderGreeksCalculator()

# Example: ATM call warrant on VNM
S = 50000  # VNM price
K = 50000  # Strike (ATM)
T = 0.25   # 3 months to expiry
r = 0.0376 # VN risk-free rate
sigma = 0.30  # 30% vol

print("\n🔷 Example: CVNM2501 (Call warrant on VNM)")
print(f"   Underlying: {S:,} VND")
print(f"   Strike: {K:,} VND (ATM)")
print(f"   Time to expiry: {T*12:.1f} months")
print(f"   Volatility: {sigma*100:.0f}%")

greeks = calc.calculate_all_greeks(S, K, T, r, sigma, 'c')

print("\n📊 First-Order Greeks:")
print(f"   Delta (Δ): {greeks['first_order']['delta']:>8.4f}")
print(f"   Gamma (Γ): {greeks['first_order']['gamma']:>8.6f}")
print(f"   Vega  (ν): {greeks['first_order']['vega']:>8.4f}")
print(f"   Theta (Θ): {greeks['first_order']['theta']:>8.4f}")

print("\n🔬 Second-Order Greeks:")
print(f"   Vanna (𝒱): {greeks['second_order']['vanna']:>8.6f} ← Delta sensitivity to vol")
print(f"   Volga (𝒲): {greeks['second_order']['volga']:>8.6f} ← Vega sensitivity to vol")
print(f"   Charm:     {greeks['second_order']['charm']:>8.6f} ← Delta decay over time")
print(f"   Veta:      {greeks['second_order']['veta']:>8.2f} ← Vega decay over time")

# ============================================================================
# PART 4: TAYLOR SERIES P&L WITH VANNA
# ============================================================================
print("\n" + "=" * 80)
print("💰 PART 4: TAYLOR SERIES P&L CALCULATION")
print("=" * 80)

print("\n🔷 Market Scenario: VNM moves +3000 VND, Vol increases by 5%")
delta_S = 3000
delta_sigma = 0.05
delta_t = 1/365

pnl = calc.taylor_series_pnl(greeks, delta_S, delta_sigma, delta_t)

print("\n📈 P&L Breakdown:\n")
print(f"{'Component':<20} {'Contribution':>15} {'Percentage':>12}")
print("-" * 50)
print(f"{'Delta (Δ)':<20} {pnl['breakdown']['delta']:>15,.2f} {pnl['breakdown']['delta']/pnl['total_pnl']*100:>11.1f}%")
print(f"{'Gamma (½Γ)':<20} {pnl['breakdown']['gamma']:>15,.2f} {pnl['breakdown']['gamma']/pnl['total_pnl']*100:>11.1f}%")
print(f"{'Vega (ν)':<20} {pnl['breakdown']['vega']:>15,.2f} {pnl['breakdown']['vega']/pnl['total_pnl']*100:>11.1f}%")
print(f"{'Theta (Θ)':<20} {pnl['breakdown']['theta']:>15,.2f} {pnl['breakdown']['theta']/pnl['total_pnl']*100:>11.1f}%")
print(f"{'Vanna (𝒱) ⭐':<20} {pnl['breakdown']['vanna']:>15,.2f} {pnl['breakdown']['vanna']/pnl['total_pnl']*100:>11.1f}%")
print(f"{'Volga (½𝒲) ⭐':<20} {pnl['breakdown']['volga']:>15,.2f} {pnl['breakdown']['volga']/pnl['total_pnl']*100:>11.1f}%")
print("-" * 50)
print(f"{'TOTAL P&L':<20} {pnl['total_pnl']:>15,.2f} {'100.0%':>12}")

print(f"\n💡 Analysis:")
print(f"   - Linear approx (Δ+Γ only): {pnl['linear_approx']:,.2f} VND")
print(f"   - With Vanna/Volga: {pnl['total_pnl']:,.2f} VND")
print(f"   - Cross-term contribution: {pnl['cross_term_error']:,.2f} VND ({pnl['error_percentage']:.2f}%)")
print(f"\n   ⭐ Vanna & Volga capture the interaction between price and volatility changes!")

# ============================================================================
# PART 5: PRACTICAL HEDGING EXAMPLE
# ============================================================================
print("\n" + "=" * 80)
print("🛡️  PART 5: PRACTICAL HEDGING WITH VANNA")
print("=" * 80)

print("\n🔷 Scenario: You're delta-hedged with 10,000 CVNM2501 warrants")
position_size = 10000
position_delta = greeks['first_order']['delta'] * position_size
position_vanna = greeks['second_order']['vanna'] * position_size

print(f"\n   Initial position:")
print(f"   - Warrants: {position_size:,} contracts")
print(f"   - Net Delta: {position_delta:,.0f} (hedge with {abs(position_delta):,.0f} shares of VNM)")
print(f"   - Net Vanna: {position_vanna:.4f}")

print(f"\n   💥 Market event: Volatility spikes +10% (from 30% to 40%)")
delta_vol = 0.10

# Calculate delta change due to Vanna
delta_change = position_vanna * delta_vol
new_delta = position_delta + delta_change

print(f"\n   📊 Impact of Vanna:")
print(f"   - Delta change: {delta_change:,.0f}")
print(f"   - New Delta: {new_delta:,.0f}")
print(f"   - Need to rehedge: {abs(delta_change):,.0f} shares!")

print(f"\n   💡 Without accounting for Vanna, your delta hedge would be off by {abs(delta_change):,.0f} shares")
print(f"      At VNM = {S:,} VND, that's {abs(delta_change * S):,.0f} VND exposure!")

# ============================================================================
# SUMMARY
# ============================================================================
print("\n" + "=" * 80)
print("✅ SUMMARY OF FIXES")
print("=" * 80)

print("""
✅ Phase 1 - Critical Bugs Fixed:
   1. Warrant Comparison N/A issue → Fixed formatGreek calls
   2. MonteCarloRiskEngine → Complete rewrite with proper VaR formulas
   3. Portfolio Greeks → Clarified aggregation formulas

✅ Phase 2 - Advanced Greeks:
   4. Second-Order Greeks → Vanna, Volga, Charm, Veta using py_vollib

📊 Key Improvements:
   - Proper CVaR calculation (ES_α = |μ - σ × φ(z_α)/(1-α)|)
   - √t scaling for multi-day VaR
   - Stress testing with multiple scenarios
   - Second-order cross terms for accurate P&L
   - Vanna-adjusted delta hedging

📚 Theory Implemented:
   - Historical VaR (Riskfolio-Lib approach)
   - Parametric VaR (Normal distribution)
   - Taylor Series with Vanna/Volga
   - Greeks-based risk management

🇻🇳 Vietnamese Market Considerations:
   - Fat-tailed returns → Historical VaR preferred
   - High volatility clustering → Vanna is critical
   - Risk-free rate: 3.76% (VN 10Y bond)
   - All values in VND
""")

print("=" * 80)
print("🎉 ALL DEMOS COMPLETED SUCCESSFULLY!")
print("=" * 80)
print("\n📖 See FIXES_SUMMARY.md for detailed documentation")
print("🧪 Run 'python test_risk_fixes.py' for unit tests")
print("🔬 Run 'python backend/services/greeks_services/second_order_greeks.py' for Greeks tests") 
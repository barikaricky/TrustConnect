import { Request, Response } from 'express';

/**
 * Payment Controller
 * Handles bank account verification using Flutterwave Resolve API.
 * Returns the REAL account holder name so the mobile app can
 * compare it against the NIN-verified name.
 *
 * Strategy:
 *  1. Try Flutterwave bank-resolve → returns real account name
 *  2. If API fails → let front-end handle with manual fallback
 */

const FLW_SECRET = process.env.FLUTTERWAVE_SECRET_KEY || '';

/* ── Nigerian bank → Flutterwave code mapping ───────────────── */
const BANK_CODE_MAP: Record<string, string> = {
  'access bank': '044',
  'citibank': '023',
  'ecobank nigeria': '050',
  'ecobank': '050',
  'fidelity bank': '070',
  'first bank of nigeria': '011',
  'first bank': '011',
  'first city monument bank (fcmb)': '214',
  'first city monument bank': '214',
  'fcmb': '214',
  'globus bank': '00103',
  'guaranty trust bank (gtbank)': '058',
  'guaranty trust bank': '058',
  'gtbank': '058',
  'gtb': '058',
  'heritage bank': '030',
  'keystone bank': '082',
  'kuda bank': '50211',
  'kuda': '50211',
  'polaris bank': '076',
  'providus bank': '101',
  'stanbic ibtc bank': '221',
  'stanbic ibtc': '221',
  'standard chartered bank': '068',
  'standard chartered': '068',
  'sterling bank': '232',
  'suntrust bank': '100',
  'union bank': '032',
  'united bank for africa (uba)': '033',
  'united bank for africa': '033',
  'uba': '033',
  'unity bank': '215',
  'wema bank': '035',
  'zenith bank': '057',
  'opay': '999992',
  'palmpay': '999991',
  'moniepoint': '50515',
  'jaiz bank': '301',
};

function getBankCode(bankName: string): string | null {
  const normalized = bankName.toLowerCase().trim();
  if (BANK_CODE_MAP[normalized]) return BANK_CODE_MAP[normalized];
  // Partial match
  for (const [key, code] of Object.entries(BANK_CODE_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) return code;
  }
  return null;
}

/* ── Helper: fuzzy name match ─────────────────────────────────
 * Returns true when names share enough tokens.
 * "OLAKUNLE SAMUEL AYODELE" ≈ "AYODELE OLAKUNLE S" → true
 * ─────────────────────────────────────────────────────────── */
function namesMatch(ninName: string, bankName: string): boolean {
  const normalize = (n: string) =>
    n
      .toUpperCase()
      .replace(/[^A-Z\s]/g, '')
      .split(/\s+/)
      .filter(Boolean)
      .sort();

  const a = normalize(ninName);
  const b = normalize(bankName);

  if (a.length === 0 || b.length === 0) return false;

  // Count how many tokens match
  let matches = 0;
  for (const token of a) {
    if (b.some((bt) => bt === token || bt.startsWith(token) || token.startsWith(bt))) {
      matches++;
    }
  }

  // At least 2 tokens OR >60 % of the shorter list must match
  const minLen = Math.min(a.length, b.length);
  return matches >= 2 || matches / minLen >= 0.6;
}

export class PaymentController {
  /* ──────────────────────────────────────────────────
   * POST /api/payment/verify-account
   * Body: { bankName, accountNumber, ninName? }
   * Returns: { success, accountName, nameMatch }
   * ────────────────────────────────────────────────── */
  static async verifyBankAccount(req: Request, res: Response) {
    try {
      const { bankName, accountNumber, ninName } = req.body;

      if (!bankName || !accountNumber) {
        return res.status(400).json({
          success: false,
          message: 'bankName and accountNumber are required',
        });
      }

      const cleanAccount = accountNumber.replace(/\s/g, '');
      if (!/^\d{10}$/.test(cleanAccount)) {
        return res.status(400).json({
          success: false,
          message: 'Account number must be exactly 10 digits',
        });
      }

      if (bankName.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid bank name',
        });
      }

      const bankCode = getBankCode(bankName);

      /* ── 1. Try Flutterwave bank resolve ──────────────── */
      if (FLW_SECRET && bankCode) {
        try {
          const flwRes = await fetch(
            `https://api.flutterwave.com/v3/accounts/resolve`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${FLW_SECRET}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                account_number: cleanAccount,
                account_bank: bankCode,
              }),
            }
          );

          if (flwRes.ok) {
            const flwData: any = await flwRes.json();
            if (flwData.status === 'success' && flwData.data?.account_name) {
              const accountName = flwData.data.account_name.toUpperCase();
              const nameMatchResult = ninName ? namesMatch(ninName, accountName) : true;

              console.log(`🏦 [LIVE] Resolved ${cleanAccount} @ ${bankName} → ${accountName} | NIN match: ${nameMatchResult}`);

              return res.json({
                success: true,
                accountName,
                bankName: bankName.trim(),
                accountNumber: cleanAccount,
                verificationSource: 'flutterwave',
                nameMatch: nameMatchResult,
                message: nameMatchResult
                  ? 'Bank account verified — name matches your ID'
                  : 'Bank account found but name does NOT match your ID',
              });
            }
          }

          console.warn(`⚠️ Flutterwave returned ${flwRes.status} for ${bankName}/${cleanAccount}`);
        } catch (flwErr) {
          console.error('Flutterwave resolve error:', flwErr);
        }
      }

      /* ── 2. Fallback: return manual entry flag ────────── */
      console.log(`🔄 [MANUAL] Bank resolve unavailable for ${bankName}/${cleanAccount} → manual`);

      return res.json({
        success: true,
        accountName: '',
        bankName: bankName.trim(),
        accountNumber: cleanAccount,
        verificationSource: 'manual',
        manualEntry: true,
        nameMatch: null,
        message: 'Auto-verification unavailable. Please confirm your account name.',
      });
    } catch (error) {
      console.error('Bank verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Bank account verification failed',
      });
    }
  }
}

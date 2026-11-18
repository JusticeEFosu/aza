/**
 * Paystack processing fee calculation utilities (Nigeria / NGN)
 *
 * Rules:
 * - Local transactions under ₦2,500: 1.5% (₦100 flat fee waived)
 * - Local transactions ₦2,500 and above: 1.5% + ₦100
 * - Fee cap: Capped at ₦2,000 maximum
 *
 * When Fan Pays (Gross Markup formula):
 * We calculate the gross charge T such that: T - PaystackFee(T) = BaseAmount
 * - For Base < ₦2,463: T = ceil(Base / 0.985)
 * - For Base >= ₦124,667: T = Base + 2,000 (since max fee is ₦2,000)
 * - Otherwise: T = ceil((Base + 100) / 0.985)
 */

export type FeeBearer = 'creator' | 'fan' | 'voluntary';

export interface FeeCalculationResult {
  baseAmount: number;
  processingFee: number;
  totalCharged: number;
  creatorReceives: number;
  effectiveRatePercent: number;
}

/**
 * Calculates what the fee would be if passed to the fan so that creator receives the exact base amount.
 */
export function calculateFanCoverFee(baseAmountNaira: number): { fee: number; totalCharged: number } {
  if (baseAmountNaira <= 0) return { fee: 0, totalCharged: 0 };

  let totalCharged: number;
  if (baseAmountNaira < 2463) {
    totalCharged = Math.ceil(baseAmountNaira / 0.985);
  } else if (baseAmountNaira >= 124667) {
    totalCharged = baseAmountNaira + 2000;
  } else {
    totalCharged = Math.ceil((baseAmountNaira + 100) / 0.985);
  }

  const fee = totalCharged - baseAmountNaira;
  return { fee, totalCharged };
}

/**
 * Calculates standard Paystack fee deducted if the creator absorbs the fee.
 */
export function calculateCreatorAbsorbFee(baseAmountNaira: number): { fee: number; creatorReceives: number } {
  if (baseAmountNaira <= 0) return { fee: 0, creatorReceives: 0 };

  let fee: number;
  if (baseAmountNaira < 2500) {
    fee = Math.round(baseAmountNaira * 0.015);
  } else {
    fee = Math.min(2000, Math.round(baseAmountNaira * 0.015 + 100));
  }

  return { fee, creatorReceives: Math.max(0, baseAmountNaira - fee) };
}

/**
 * Full calculation according to the creator's fee policy and fan's choice.
 */
export function calculateProcessingFee(
  baseAmountNaira: number,
  feeBearer: FeeBearer = 'creator',
  fanCovered: boolean = false
): FeeCalculationResult {
  if (baseAmountNaira <= 0) {
    return {
      baseAmount: 0,
      processingFee: 0,
      totalCharged: 0,
      creatorReceives: 0,
      effectiveRatePercent: 0,
    };
  }

  const isFanCovering = feeBearer === 'fan' || (feeBearer === 'voluntary' && fanCovered);

  if (isFanCovering) {
    const { fee, totalCharged } = calculateFanCoverFee(baseAmountNaira);
    const rate = parseFloat(((fee / baseAmountNaira) * 100).toFixed(2));
    return {
      baseAmount: baseAmountNaira,
      processingFee: fee,
      totalCharged,
      creatorReceives: baseAmountNaira,
      effectiveRatePercent: rate,
    };
  } else {
    const { fee, creatorReceives } = calculateCreatorAbsorbFee(baseAmountNaira);
    const rate = parseFloat(((fee / baseAmountNaira) * 100).toFixed(2));
    return {
      baseAmount: baseAmountNaira,
      processingFee: fee,
      totalCharged: baseAmountNaira,
      creatorReceives,
      effectiveRatePercent: rate,
    };
  }
}

export interface FeePresetItem {
  amount: number;
  feeIfCreatorPays: number;
  creatorReceivesIfCreatorPays: number;
  feeIfFanPays: number;
  fanPaysIfFanPays: number;
  effectiveRatePercent: number;
  note: string;
}

/**
 * Returns a matrix of common donation amounts for the settings preview.
 */
export function getFeeMatrixPresets(): FeePresetItem[] {
  const amounts = [500, 1000, 2500, 5000, 10000, 25000, 50000, 100000, 150000];

  return amounts.map((amt) => {
    const creatorPays = calculateCreatorAbsorbFee(amt);
    const fanPays = calculateFanCoverFee(amt);

    let note = '';
    if (amt < 2500) {
      note = 'Flat ₦100 waived (1.5%)';
    } else if (fanPays.fee >= 2000 || creatorPays.fee >= 2000) {
      note = 'Capped at ₦2,000 max';
    } else {
      note = '1.5% + ₦100 applied';
    }

    return {
      amount: amt,
      feeIfCreatorPays: creatorPays.fee,
      creatorReceivesIfCreatorPays: creatorPays.creatorReceives,
      feeIfFanPays: fanPays.fee,
      fanPaysIfFanPays: fanPays.totalCharged,
      effectiveRatePercent: parseFloat(((fanPays.fee / amt) * 100).toFixed(2)),
      note,
    };
  });
}

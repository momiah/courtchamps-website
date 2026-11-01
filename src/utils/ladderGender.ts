import { GENDER_TYPE, LADDER_TYPE } from "courtchamps-shared/types";
import type { GenderType, LadderType } from "courtchamps-shared/types";

/** Mixed only exists for doubles; a singles ladder is men's or women's. */
export const genderOptionsFor = (ladderType: LadderType): GenderType[] =>
  ladderType === LADDER_TYPE.DOUBLES
    ? [GENDER_TYPE.MENS, GENDER_TYPE.WOMENS, GENDER_TYPE.MIXED]
    : [GENDER_TYPE.MENS, GENDER_TYPE.WOMENS];

export const isGenderAllowed = (
  ladderType: LadderType,
  genderType: GenderType,
): boolean => genderOptionsFor(ladderType).includes(genderType);

export const MIXED_SINGLES_ERROR =
  "Mixed is only for doubles. Choose Mens or Womens for a singles ladder.";

import { getData } from "country-list";

export interface CountryOption {
  code: string;
  name: string;
}

export const COUNTRY_OPTIONS: CountryOption[] = getData()
  .map((country) => ({ code: country.code, name: country.name }))
  .sort((first, second) => first.name.localeCompare(second.name));

export const findCountryName = (countryCode: string): string => {
  const match = COUNTRY_OPTIONS.find(
    (country) => country.code === countryCode,
  );
  return match?.name ?? "";
};

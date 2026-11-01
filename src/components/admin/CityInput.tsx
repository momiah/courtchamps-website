import React, { useEffect, useState } from "react";
import { TextInput } from "./formControls";

interface CityInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "list"
> {
  id: string;
  countryCode: string;
  /** Cities to list first, e.g. the ones the selected courts are in. */
  suggestions?: string[];
}

/** The country's cities to pick from, with any other city typed in. The city list loads only when this field is shown. */
const CityInput = React.forwardRef<HTMLInputElement, CityInputProps>(
  ({ id, countryCode, suggestions = [], ...inputProps }, ref) => {
    const [cities, setCities] = useState<string[]>([]);

    useEffect(() => {
      setCities([]);
      if (!countryCode) return;
      let active = true;
      import("country-state-city")
        .then(({ City }) => {
          if (!active) return;
          const names = (City.getCitiesOfCountry(countryCode) ?? []).map(
            (city) => city.name,
          );
          setCities(Array.from(new Set(names)).sort());
        })
        .catch((error) => console.error("Failed to load cities", error));
      return () => {
        active = false;
      };
    }, [countryCode]);

    const options = Array.from(new Set([...suggestions, ...cities]));
    const listId = `${id}-options`;

    return (
      <>
        <TextInput
          ref={ref}
          id={id}
          type="text"
          autoComplete="off"
          list={listId}
          {...inputProps}
        />
        <datalist id={listId}>
          {options.map((city) => (
            <option key={city} value={city} />
          ))}
        </datalist>
      </>
    );
  },
);

CityInput.displayName = "CityInput";

/** The city most of these courts are in, for pre-filling a ladder's city. */
export const mostCommonCity = (
  cities: (string | null | undefined)[],
): string => {
  const counts = new Map<string, number>();
  cities.forEach((city) => {
    const name = city?.trim();
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
  });
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
};

export default CityInput;

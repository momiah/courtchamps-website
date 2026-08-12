import { Court } from "../types/ladder";

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export const buildAddressQuery = ({
  address,
  city,
  postCode,
  country,
}: {
  address: string;
  city: string;
  postCode: string;
  country: string;
}): string =>
  [address, city, postCode, country]
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .join(", ");

// Full addresses (unit numbers, mall levels) sometimes miss, so try
// progressively broader queries. Country is applied separately as a bias.
export const buildCourtSearchCandidates = ({
  address,
  city,
  postCode,
}: {
  address: string;
  city: string;
  postCode: string;
}): string[] => {
  const candidates = [
    buildAddressQuery({ address, city, postCode, country: "" }),
    buildAddressQuery({ address, city, postCode: "", country: "" }),
    postCode.trim(),
    buildAddressQuery({ address: "", city, postCode: "", country: "" }),
  ];

  return Array.from(
    new Set(candidates.map((candidate) => candidate.trim())),
  ).filter((candidate) => candidate.length > 0);
};

export const buildCourtCandidatesFromCourt = (court: Court): string[] =>
  buildCourtSearchCandidates({
    address: court.location.address,
    city: court.location.city,
    postCode: court.location.postCode,
  });

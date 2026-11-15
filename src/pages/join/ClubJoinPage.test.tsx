import React from "react";
import { render, screen } from "@testing-library/react";
import ClubJoinPage from "./ClubJoinPage";

let mockClubId = "";
jest.mock(
  "react-router-dom",
  () => ({
    useParams: () => ({ clubId: mockClubId }),
    Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
  }),
  { virtual: true },
);
jest.mock("../../services/firebase.config", () => ({ db: {} }));
jest.mock("../../assets", () => ({ CourtChampLogo: "logo.png" }));
jest.mock("./joinParts", () => {
  const actual = jest.requireActual("./joinParts");
  return { ...actual, StoreBadges: () => null };
});

const mockGetDoc = jest.fn();
const mockGetDocs = jest.fn();
jest.mock("firebase/firestore", () => ({
  collection: (_db: unknown, ...path: string[]) => ({ path: path.join("/") }),
  doc: (_db: unknown, ...path: string[]) => ({ path: path.join("/") }),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
}));

const renderAt = (clubId: string) => {
  mockClubId = clubId;
  return render(<ClubJoinPage />);
};

describe("ClubJoinPage", () => {
  beforeEach(() => {
    mockGetDoc.mockReset();
    mockGetDocs.mockReset();
  });

  it("shows the club from the clubs collection with its members", async () => {
    mockGetDoc.mockResolvedValue({
      id: "Smash-Club-2026-11-03-AB12C",
      exists: () => true,
      data: () => ({
        clubName: "Smash Club",
        clubLocation: { city: "Leeds", country: "United Kingdom" },
        clubDescription: "Thursday nights",
        clubImage: "",
        clubOwner: { userId: "o1", username: "owner1" },
      }),
    });
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: "o1",
          data: () => ({
            firstName: "Olly",
            lastName: "Owner",
            username: "owner1",
          }),
        },
        {
          id: "m1",
          data: () => ({
            firstName: "Mia",
            lastName: "Member",
            username: "mia",
          }),
        },
      ],
    });

    renderAt("Smash-Club-2026-11-03-AB12C");

    expect(
      await screen.findByRole("heading", { name: "Smash Club" }),
    ).toBeInTheDocument();
    expect(mockGetDoc).toHaveBeenCalledWith({
      path: "clubs/Smash-Club-2026-11-03-AB12C",
    });
    expect(screen.getByText("📍 Leeds, United Kingdom")).toBeInTheDocument();
    expect(screen.getByText("Members (2)")).toBeInTheDocument();
    expect(screen.getByText("Thursday nights")).toBeInTheDocument();
    expect(screen.getByText("Mia M")).toBeInTheDocument();
  });

  it("says the club was not found when it doesn't exist", async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });
    mockGetDocs.mockResolvedValue({ docs: [] });

    renderAt("missing");

    expect(await screen.findByText("Club Not Found")).toBeInTheDocument();
  });
});

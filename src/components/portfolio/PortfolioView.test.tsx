import { vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PortfolioView } from "./PortfolioView";
import type { Group, Asset } from "../../types";

let mockGroups: Group[] = [];
let mockAssets: Asset[] = [];
let mockGroupsFetching = false;

// Track collections to distinguish groups vs assets queries
const mockCollections = new Map<string, unknown>();

vi.mock("rxdb-hooks", () => ({
  useRxCollection: (name: string) => {
    const sentinel = {
      _collection: name,
      find: () => ({ _collection: name }),
      findOne: () => ({ exec: vi.fn() }),
    };
    mockCollections.set(name, sentinel);
    return sentinel;
  },
  useRxQuery: (query: { _collection?: string } | undefined) => {
    if (!query || !query._collection) {
      return { result: [], isFetching: false };
    }
    if (query._collection === "groups") {
      return { result: mockGroups, isFetching: mockGroupsFetching };
    }
    return { result: mockAssets, isFetching: false };
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockGroups = [];
  mockAssets = [];
  mockGroupsFetching = false;
});

describe("PortfolioView", () => {
  it("shows empty state when no groups exist", () => {
    render(<PortfolioView />);

    expect(
      screen.getByText("No groups yet. Add a group to get started."),
    ).toBeInTheDocument();
  });

  it("shows loading spinner while fetching groups", () => {
    mockGroupsFetching = true;
    render(<PortfolioView />);

    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(screen.queryByText(/No groups yet/)).not.toBeInTheDocument();
  });

  it("renders groups", () => {
    mockGroups = [
      { id: "g1", name: "Stocks", targetPercentage: 60, deviationThreshold: 5 },
      { id: "g2", name: "Bonds", targetPercentage: 40, deviationThreshold: 3 },
    ];
    render(<PortfolioView />);

    expect(screen.getByText("Stocks")).toBeInTheDocument();
    expect(screen.getByText("Bonds")).toBeInTheDocument();
  });

  it("shows warning when percentages do not total 100", () => {
    mockGroups = [
      { id: "g1", name: "Stocks", targetPercentage: 60, deviationThreshold: 5 },
      { id: "g2", name: "Bonds", targetPercentage: 30, deviationThreshold: 3 },
    ];
    render(<PortfolioView />);

    expect(
      screen.getByText("Group percentages total 90% — must equal 100%."),
    ).toBeInTheDocument();
  });

  it("does not show warning when percentages total 100", () => {
    mockGroups = [
      { id: "g1", name: "Stocks", targetPercentage: 60, deviationThreshold: 5 },
      { id: "g2", name: "Bonds", targetPercentage: 40, deviationThreshold: 3 },
    ];
    render(<PortfolioView />);

    expect(screen.queryByText(/must equal 100%/)).not.toBeInTheDocument();
  });

  it("has an Add Group button", () => {
    render(<PortfolioView />);

    expect(
      screen.getByRole("button", { name: /Add Group/ }),
    ).toBeInTheDocument();
  });
});

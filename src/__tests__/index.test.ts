import { setFailed } from "@actions/core";
import { context } from "@actions/github";
import { execSync } from "child_process";
import { jest } from "@jest/globals";
import { run } from "../index";
import { readFile } from "fs/promises";

// Mock the dependencies
jest.mock("@actions/core", () => ({
  setFailed: jest.fn(),
}));
jest.mock("@octokit/rest", () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    pulls: {
      get: jest.fn<any>().mockResolvedValue({
        data: {
          head: {
            sha: "mocked-sha-123456", // Mocked SHA value
          },
        },
      }),
    },
  })),
}));

jest.mock("@actions/github", () => ({
  context: {
    payload: {
      pull_request: null,
      repository: {
        owner: {
          login: "ow",
        },
        name: "repo",
      },
    },
  },
  getOctokit: jest.fn(),
}));

jest.mock("child_process", () => ({
  execSync: jest.fn(),
}));

describe("run function", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should execute git diff and log output", async () => {
    // Arrange
    context.payload.pull_request = { id: 123 } as any;
    process.env.GITHUB_TOKEN = "mock-gh-token";
    process.env.FETCH_HEAD = "mock-fetch-head";
    process.env.FETCH_HEAD_PARENT = "mock-fetch-head-parent";

    const mockDiff = (await readFile(`${__dirname}/mock-diff.txt`)).toString();

    const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;
    mockExecSync.mockReturnValue(mockDiff);

    // Act
    await run();

    // Assert
    expect(mockExecSync).toHaveBeenCalledWith(
      "git diff mock-fetch-head-parent mock-fetch-head",
      { encoding: "utf-8" }
    );
  });

  it("should fail if not triggered by a pull request", async () => {
    // Arrange
    context.payload.pull_request = null as any;

    // Act
    await run();

    // Assert
    expect(setFailed).toHaveBeenCalledWith(
      "This action can only be run on Pull Requests."
    );
  });

  it("should log Hello World when triggered by a pull request", async () => {
    // Arrange
    context.payload.pull_request = { id: 123 } as any;

    // Act
    await run();
  });

  it("should call setFailed on error", async () => {
    // Arrange
    context.payload.pull_request = { id: 123 } as any;
    process.env.FETCH_HEAD = "mock-fetch-head";
    process.env.FETCH_HEAD_PARENT = "mock-fetch-head-parent";

    const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;
    mockExecSync.mockImplementation(() => {
      throw new Error("Mock error");
    });

    // Act
    await run();

    // Assert
    expect(setFailed).toHaveBeenCalledWith("Mock error");
  });
});

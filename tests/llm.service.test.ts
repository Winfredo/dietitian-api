const invokeMock = jest.fn();
const withStructuredOutputMock = jest.fn(() => ({ invoke: invokeMock }));

jest.mock("@langchain/openai", () => ({
  ChatOpenAI: jest.fn().mockImplementation(() => ({
    withStructuredOutput: withStructuredOutputMock,
  })),
}));

jest.mock("@langchain/google-genai", () => ({
  ChatGoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    withStructuredOutput: withStructuredOutputMock,
  })),
}));

import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import {
  extractMedicalHistory,
  generateNutritionPlan,
} from "../src/services/llm.service";

const validHistory = {
  fullName: "Jane Doe",
  conditions: [],
  medications: [],
};

const validPlan = {
  summary: "Eat well.",
  foodsToAvoid: [],
  nutrientsToLimit: [],
  foodsToEat: [],
  nutrientsToIncrease: [],
  healthTips: [],
};

describe("llm.service", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    withStructuredOutputMock.mockClear();
    (ChatOpenAI as unknown as jest.Mock).mockClear();
    (ChatGoogleGenerativeAI as unknown as jest.Mock).mockClear();
  });

  describe("extractMedicalHistory", () => {
    it("uses ChatGoogleGenerativeAI by default and returns the schema-validated history", async () => {
      invokeMock.mockResolvedValue(validHistory);

      const result = await extractMedicalHistory([
        { type: "image", mimeType: "image/png", data: "base64data" },
      ]);

      expect(ChatGoogleGenerativeAI).toHaveBeenCalledTimes(1);
      expect(ChatOpenAI).not.toHaveBeenCalled();
      expect(result.fullName).toBe("Jane Doe");
      expect(result.allergies).toEqual([]);
    });

    it("uses ChatOpenAI when provider is openai", async () => {
      invokeMock.mockResolvedValue(validHistory);

      await extractMedicalHistory(
        [{ type: "image", mimeType: "image/png", data: "base64data" }],
        "openai"
      );

      expect(ChatOpenAI).toHaveBeenCalledTimes(1);
      expect(ChatGoogleGenerativeAI).not.toHaveBeenCalled();
    });

    it("appends the caller-provided content blocks after the instruction text", async () => {
      invokeMock.mockResolvedValue(validHistory);

      await extractMedicalHistory([
        { type: "file", mimeType: "application/pdf", data: "abc123" },
      ]);

      const [[messages]] = invokeMock.mock.calls;
      const message = messages[0];
      expect(message.content).toEqual([
        {
          type: "text",
          text: "Extract all medical history details from this document into the structured schema.",
        },
        {
          type: "file",
          mimeType: "application/pdf",
          data: "abc123",
        },
      ]);
    });

    it("throws if the LLM response fails schema validation", async () => {
      invokeMock.mockResolvedValue({ fullName: "Jane Doe" }); // missing required conditions/medications

      await expect(
        extractMedicalHistory([
          { type: "image", mimeType: "image/png", data: "abc" },
        ])
      ).rejects.toThrow();
    });
  });

  describe("generateNutritionPlan", () => {
    it("returns the plan with schema defaults applied", async () => {
      invokeMock.mockResolvedValue(validPlan);

      const result = await generateNutritionPlan(validHistory as never);

      expect(result.disclaimer).toMatch(/not medical advice/i);
    });

    it("includes the patient history in the prompt text", async () => {
      invokeMock.mockResolvedValue(validPlan);

      await generateNutritionPlan(validHistory as never);

      const [[messages]] = invokeMock.mock.calls;
      const message = messages[0];
      expect(typeof message.content).toBe("string");
      expect(message.content).toContain("Jane Doe");
    });

    it("throws if the LLM response fails schema validation", async () => {
      invokeMock.mockResolvedValue({ summary: "Eat well." }); // missing required arrays

      await expect(generateNutritionPlan(validHistory as never)).rejects.toThrow();
    });
  });
});

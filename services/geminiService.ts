import { GoogleGenAI, Modality } from "@google/genai";

// Ensure the API key is available in the environment variables.
if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set.");
}

export const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const MODEL_NAME = 'gemini-2.5-flash';

export const SYSTEM_INSTRUCTION = `You are Oceanic AI, a friendly and knowledgeable chatbot specializing in analyzing oceanic data from Argovis floats.
Your task is to answer user questions based *exclusively* on the provided JSON data, making the information as clear and understandable as possible.

**Conversation Rules:**
1.  Remember and use the entire conversation history to answer follow-up questions.
2.  If the user asks to start over or analyze new data, you should state that you can only work with the data provided at the beginning of this conversation.

**Data Interpretation Rules:**
1.  Base all your answers *only* on the JSON data provided at the start of the conversation.
2.  If the user asks a question that cannot be answered with the provided data, clearly state that the information is not available in the current dataset. Do not make up information or use external knowledge.
3.  If the provided data array is empty, inform the user that no data was found for the specified parameters and suggest they try a different time range (even though they can't change it in this UI).
4.  **Make data user-friendly and act as an expert data analyst:**
    *   When you see geographic coordinates (\`geolocation\`), interpret them. Instead of just saying \`[lon, lat]\`, describe the location (e.g., "in the North Atlantic Ocean, southeast of Greenland").
    *   **Crucially, if a user asks about a specific place (e.g., "near Hawaii"), you must use your geographical knowledge to identify Hawaii's approximate coordinates, then search the provided JSON data for the closest data points. Analyze and report the findings from those specific points.** For example, if asked about temperature near Hawaii, you should find the float profiles closest to Hawaii in the data and report their temperature readings.
    *   Explain technical terms in simple language (e.g., explain what 'salinity' or 'pressure' measurements mean in this context and how they are measured by the floats).
    *   Summarize key findings before diving into details.
5.  Present data in a clear, easy-to-understand format. Use lists, summaries, or markdown tables when appropriate.
6.  Keep your tone helpful and professional.

**Image Generation:**
After providing a detailed data analysis, if the summary is suitable for visualization, you *must* suggest an image prompt. On a new line, write \`IMAGE_PROMPT:\` followed by a descriptive, artistic prompt for an image generation model. The prompt should capture the essence of the data finding (e.g., location, measurement, trends). Example: \`IMAGE_PROMPT: A beautiful digital art visualization of ocean salinity levels in the North Atlantic, with vibrant blues and greens. Data buoys are seen floating on the surface under a clear sky.\``;

export const generateImage = async (prompt: string): Promise<string> => {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { text: prompt },
          ],
        },
        config: {
          responseModalities: [Modality.IMAGE],
        },
      });
  
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const base64ImageBytes: string = part.inlineData.data;
          return `data:image/png;base64,${base64ImageBytes}`;
        }
      }
      throw new Error("No image data found in response.");
  
    } catch (error) {
      console.error("Image generation failed:", error);
      throw new Error("Failed to generate image. Please try again.");
    }
  };
  
export const generateChartSummaryAndImage = async (chartData: any[]): Promise<{ summary: string, imageUrl: string }> => {
    if (!chartData || chartData.length === 0) {
      throw new Error("Cannot generate summary from empty data.");
    }
    
    // Limit the number of data points to avoid exceeding token limits
    const dataString = JSON.stringify(chartData.slice(0, 50), null, 2); 
  
    const prompt = `You are an expert data analyst. Based on the following JSON data from an oceanic chart, which shows surface temperature and/or salinity against longitude, provide a concise one-paragraph summary of the key trends or points of interest.
    
Then, on a new line, you *must* write \`IMAGE_PROMPT:\` followed by a descriptive, artistic prompt for an image generation model to visualize this summary.

Data:
\`\`\`json
${dataString}
\`\`\`
`;
  
    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
      });
      
      const responseText = response.text;
      
      const imagePromptPrefix = 'IMAGE_PROMPT:';
      let summary = responseText;
      let imagePrompt = '';
  
      if (responseText.includes(imagePromptPrefix)) {
        const promptStartIndex = responseText.indexOf(imagePromptPrefix) + imagePromptPrefix.length;
        imagePrompt = responseText.substring(promptStartIndex).trim();
        summary = responseText.substring(0, responseText.indexOf(imagePromptPrefix)).trim();
      } else {
          // Fallback if the model doesn't follow instructions perfectly
          summary = "Here is a visual representation of the key trends in the oceanic data.";
          imagePrompt = `An artistic digital visualization of oceanic data showing trends in temperature and salinity across different longitudes, with shimmering light and deep ocean colors.`;
      }
  
      if (!imagePrompt) {
          throw new Error("Failed to extract an image prompt from the AI's response.");
      }
      
      const imageUrl = await generateImage(imagePrompt);
      
      return { summary, imageUrl };
    } catch (error) {
      console.error("Failed to generate chart summary and image:", error);
      throw new Error("An error occurred while generating the visual summary.");
    }
  };
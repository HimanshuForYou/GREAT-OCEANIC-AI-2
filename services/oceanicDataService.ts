export const getOceanicData = async (startDateString: string): Promise<any[]> => {
  try {
    // Ensure the date string is treated as UTC to avoid timezone issues
    const startDate = new Date(`${startDateString}T00:00:00Z`);
    
    // Calculate end date as 24 hours after the start date
    const endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);

    const startDateISO = startDate.toISOString();
    const endDateISO = endDate.toISOString();

    const API_URL = `https://argovis-api.colorado.edu/argo?startDate=${startDateISO}&endDate=${endDateISO}`;

    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to fetch oceanic data:", error);
    throw new Error("Could not retrieve oceanic data. The Argovis API might be down or the request failed.");
  }
};
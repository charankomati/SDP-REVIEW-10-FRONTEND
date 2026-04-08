export async function getHealthTrackingAdvice(history: any[], profile: any, biometrics: any, userMessage: string) {
  const response = await fetch("/api/health/advice", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ history, profile, biometrics, userMessage }),
  });

  if (!response.ok) {
    throw new Error("Health advice service unavailable");
  }

  const data = await response.json();
  return data.advice as string;
}

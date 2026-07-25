import { describe, expect, it } from "vitest";
import {
  buildPollCancellationWhatsappMessage,
  buildPollReminderWhatsappMessage,
  buildPollWhatsappMessage
} from "../lib/polls";

describe("poll whatsapp messages", () => {
  it("inclut les informations clés du sondage", () => {
    const message = buildPollWhatsappMessage({
      title: "Friday Match",
      statusLabel: "Ouvert",
      matchDate: "vendredi 25 juillet 2026",
      startTime: "20:00",
      endTime: "21:00",
      location: "Terrain OMJ",
      capacity: 10,
      presentCount: 7,
      waitlistCount: 2,
      matchAmount: "10",
      link: "https://sporty.omjep.ma/presence/token-123",
      organizationName: "Mini Sporty"
    });

    expect(message).toContain("Friday Match");
    expect(message).toContain("vendredi 25 juillet 2026");
    expect(message).toContain("20:00 - 21:00");
    expect(message).toContain("Terrain OMJ");
    expect(message).toContain("Capacité: 10");
    expect(message).toContain("Places restantes: 3");
    expect(message).toContain("Lien direct: https://sporty.omjep.ma/presence/token-123");
  });

  it("garde les rappels et annulations courts et lisibles", () => {
    const reminder = buildPollReminderWhatsappMessage({
      title: "Friday Match",
      matchDate: "vendredi 25 juillet 2026",
      startTime: "20:00",
      endTime: "21:00",
      location: "Terrain OMJ",
      matchAmount: "10",
      closesAt: "25/07/2026 18:00",
      link: "https://sporty.omjep.ma/espace/sondages"
    });
    const cancellation = buildPollCancellationWhatsappMessage({
      title: "Friday Match",
      matchDate: "vendredi 25 juillet 2026",
      startTime: "20:00",
      endTime: "21:00",
      location: "Terrain OMJ",
      matchAmount: "10",
      reason: "Météo",
      link: "https://sporty.omjep.ma/espace/sondages"
    });

    expect(reminder).toContain("Rappel");
    expect(reminder).toContain("Prix joueur: 10,00 DH");
    expect(cancellation).toContain("annulé");
    expect(cancellation).toContain("Météo");
    expect(cancellation).toContain("Prix joueur: 10,00 DH");
  });
});

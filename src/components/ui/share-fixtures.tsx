import React, { useState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ShareFixtureData {
  date: string; // ISO date or formatted
  time: string; // display time
  team1: string;
  team2: string;
  venue: string;
  officiatingTeam: string;
  tournamentName?: string;
  divisionName?: string;
}

interface ShareFixturesProps {
  contextName: string; // e.g. "Tournament Name" or "Upcoming Matches"
  fixtures: ShareFixtureData[];
}

export function ShareFixtures({ contextName, fixtures }: ShareFixturesProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const drawRoundedRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  };

  const handleShare = async () => {
    if (isGenerating || fixtures.length === 0) return;
    setIsGenerating(true);

    try {
      const MAX_PER_PAGE = 6;
      const pages = [];
      for (let i = 0; i < fixtures.length; i += MAX_PER_PAGE) {
        pages.push(fixtures.slice(i, i + MAX_PER_PAGE));
      }

      const generatedFiles: File[] = [];

      for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
        const pageFixtures = pages[pageIndex];

        const canvas = document.createElement("canvas");
        canvas.width = 1920;
        canvas.height = 1080;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Could not get canvas context");

        // Background
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, 1920, 1080);

        // Header Title
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "italic 900 64px system-ui, -apple-system, sans-serif";
        ctx.textBaseline = "top";
        ctx.textAlign = "left";
        ctx.fillText(contextName.toUpperCase(), 80, 80);

        // Pagination text fixed to Top Right
        if (pages.length > 1) {
          ctx.fillStyle = "#71717A";
          ctx.font = "bold 32px system-ui, -apple-system, sans-serif";
          ctx.textAlign = "right";
          ctx.fillText(`PART ${pageIndex + 1}/${pages.length}`, 1920 - 80, 80 + 16);
        }

        // Yellow line
        ctx.fillStyle = "#D4AF37";
        ctx.fillRect(80, 80 + 64 + 20, 120, 8);

        let currentY = 180;

        const cols = pageFixtures.length > 4 ? 2 : 1;
        const cardWidth = cols === 1 ? 1920 - 160 : Math.floor((1920 - 160 - 40) / 2);

        // Group fixtures by date
        const groupedByDate: Record<string, ShareFixtureData[]> = {};
        pageFixtures.forEach(f => {
          if (!groupedByDate[f.date]) groupedByDate[f.date] = [];
          groupedByDate[f.date].push(f);
        });

        const dateCount = Object.keys(groupedByDate).length;
        const totalRows = Math.ceil(pageFixtures.length / cols);
        const dateHeaderHeight = 60 + 20; 
        const rowGaps = totalRows * 20; 
        const availableCardSpace = 1000 - currentY - (dateCount * dateHeaderHeight) - rowGaps;
        
        const minCardHeight = 200;
        const cardHeight = Math.max(minCardHeight, Math.min(220, Math.floor(availableCardSpace / totalRows)));

        // Loop over dates
        for (const [dateStr, dateFixtures] of Object.entries(groupedByDate)) {
          // Date Header
          ctx.fillStyle = "#18181B";
          ctx.fillRect(80, currentY, 1920 - 160, 60);
          ctx.fillStyle = "#D4AF37";
          ctx.fillRect(80, currentY, 6, 60);

          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.font = "bold 36px system-ui, -apple-system, sans-serif";
          ctx.fillStyle = "#FFFFFF";
          ctx.fillText(dateStr.toUpperCase(), 80 + 20, currentY + 30);
          
          currentY += 60 + 20;

          // Draw Fixture Grid
          for (let i = 0; i < dateFixtures.length; i++) {
            const f = dateFixtures[i];
            const isRight = cols === 2 && i % 2 !== 0;
            const x = isRight ? 80 + cardWidth + 40 : 80;
            const y = currentY;

            // Card BG + Border
            ctx.fillStyle = "rgba(9, 9, 11, 0.8)";
            drawRoundedRect(ctx, x, y, cardWidth, cardHeight, 10);
            ctx.fill();
            ctx.strokeStyle = "#18181B";
            ctx.lineWidth = 2;
            ctx.stroke();

            const innerX = x + 20;
            const innerY = y + 20;

            // Time Block
            ctx.fillStyle = "rgba(212, 175, 55, 0.1)"; 
            ctx.strokeStyle = "rgba(212, 175, 55, 0.2)"; 
            drawRoundedRect(ctx, innerX, innerY, 120, 40, 5);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = "#D4AF37";
            ctx.font = "900 28px system-ui, -apple-system, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(f.time, innerX + 60, innerY + 20);

            // Context (Tournament Name)
            if (f.tournamentName) {
              ctx.textAlign = "right";
              ctx.textBaseline = "middle";
              ctx.fillStyle = "#A1A1AA";
              ctx.font = "bold 20px system-ui, -apple-system, sans-serif";
              ctx.fillText(f.tournamentName.toUpperCase(), x + cardWidth - 20, innerY + 20);
            }

            // Teams (Center Horizontal layout avoids vertical clipping)
            const footerY = y + cardHeight - 85; 
            const teamCenterY = y + 60 + (footerY - (y + 60)) / 2;
            
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = "#52525B";
            ctx.font = "italic bold 28px system-ui, -apple-system, sans-serif";
            ctx.fillText("VS", x + cardWidth / 2, teamCenterY);

            ctx.fillStyle = "#FFFFFF";
            ctx.font = "900 36px system-ui, -apple-system, sans-serif";
            
            const maxTeamWidth = cardWidth / 2 - 80;
            const drawTruncatedTeamName = (name: string, align: "left" | "right", px: number, py: number) => {
              ctx.textAlign = align;
              let n = name;
              if (ctx.measureText(n).width > maxTeamWidth) {
                 while (n.length > 0 && ctx.measureText(n + "...").width > maxTeamWidth) {
                     n = n.slice(0, -1);
                 }
                 n += "...";
              }
              ctx.fillText(n, px, py);
            };

            drawTruncatedTeamName(f.team1.toUpperCase(), "right", x + cardWidth / 2 - 50, teamCenterY);
            drawTruncatedTeamName(f.team2.toUpperCase(), "left", x + cardWidth / 2 + 50, teamCenterY);

            // Lines and footers
            ctx.strokeStyle = "#18181B";
            ctx.beginPath();
            ctx.moveTo(x + 20, footerY);
            ctx.lineTo(x + cardWidth - 20, footerY);
            ctx.stroke();

            // Venue (Left)
            ctx.textAlign = "left";
            ctx.textBaseline = "top";
            ctx.fillStyle = "#71717A";
            ctx.font = "bold 16px system-ui, -apple-system, sans-serif";
            ctx.fillText("VENUE", x + 20, footerY + 15);
            ctx.fillStyle = "#D4D4D8";
            ctx.font = "500 22px system-ui, -apple-system, sans-serif";
            ctx.fillText((f.venue || "TBA").substring(0, 40), x + 20, footerY + 40);

            // Officiating (Right - with text wrapping to prevent clipping)
            ctx.textAlign = "right";
            ctx.fillStyle = "#71717A";
            ctx.font = "bold 16px system-ui, -apple-system, sans-serif";
            ctx.fillText("OFFICIATING", x + cardWidth - 20, footerY + 15);
            ctx.fillStyle = "#D4D4D8";
            ctx.font = "500 22px system-ui, -apple-system, sans-serif";
            
            const offTeam = (f.officiatingTeam || "TBA");
            const maxOffWidth = cardWidth / 2 - 40;
            const words = offTeam.split(" ");
            let line = "";
            let textY = footerY + 40;
            for (let w = 0; w < words.length; w++) {
              const testLine = line + words[w] + " ";
              if (ctx.measureText(testLine).width > maxOffWidth && w > 0) {
                ctx.fillText(line.trim(), x + cardWidth - 20, textY);
                line = words[w] + " ";
                textY += 28; // move to next line
              } else {
                line = testLine;
              }
            }
            if (line.trim()) {
              ctx.fillText(line.trim(), x + cardWidth - 20, textY);
            }

            // Increment row Y after processing the last card in the row
            if (cols === 1 || isRight || i === dateFixtures.length - 1) {
              currentY += cardHeight + 20;
            }
          }
        }

        // Footer
        ctx.fillStyle = "#09090B";
        ctx.fillRect(0, 1080 - 80, 1920, 80);

        ctx.fillStyle = "#18181B";
        ctx.fillRect(0, 1080 - 82, 1920, 2);

        ctx.textBaseline = "middle";

        ctx.fillStyle = "#FFFFFF";
        ctx.textAlign = "left";
        ctx.font = "italic 900 32px system-ui, -apple-system, sans-serif";
        ctx.fillText("DVOC V2", 80, 1080 - 40);

        const titleWidth = ctx.measureText("DVOC V2").width;

        ctx.fillStyle = "#71717A";
        ctx.font = "500 32px system-ui, -apple-system, sans-serif";
        ctx.fillText(" | ", 80 + titleWidth, 1080 - 43);

        const sepWidth = ctx.measureText(" | ").width;

        ctx.fillStyle = "#D4AF37";
        ctx.font = "bold 28px system-ui, -apple-system, sans-serif";
        ctx.fillText("www.dvoctz.app", 80 + titleWidth + sepWidth, 1080 - 40);

        const dataUrl = canvas.toDataURL("image/png");
        const blob = await (await fetch(dataUrl)).blob();
        
        const fileName = pages.length > 1 
          ? `fixtures-${contextName.replace(/\s+/g, "-")}-pt${pageIndex + 1}.png`
          : `fixtures-${contextName.replace(/\s+/g, "-")}.png`;

        generatedFiles.push(new File([blob], fileName, { type: "image/png" }));
      }

      try {
        if (navigator.share && navigator.canShare({ files: generatedFiles })) {
          await navigator.share({
            title: `${contextName} Fixtures`,
            files: generatedFiles,
          });
        } else {
          // Fallback to multiple downloads
          generatedFiles.forEach(file => {
            const url = URL.createObjectURL(file);
            const link = document.createElement("a");
            link.download = file.name;
            link.href = url;
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 100);
          });
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          generatedFiles.forEach(file => {
            const url = URL.createObjectURL(file);
            const link = document.createElement("a");
            link.download = file.name;
            link.href = url;
            link.click();
          });
        }
      }
    } catch (error) {
      console.error("Failed to generate fixtures share image", error);
    } finally {
      setIsGenerating(false);
    }
  };

  if (fixtures.length === 0) return null;

  return (
    <Button
      onClick={handleShare}
      disabled={isGenerating}
      variant="outline"
      size="sm"
      className="border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-500 uppercase tracking-widest font-bold text-[10px] h-8 px-4"
    >
      <Share2 className="w-3 h-3 mr-2" />
      {isGenerating ? "Generating..." : "Share Fixtures"}
    </Button>
  );
}

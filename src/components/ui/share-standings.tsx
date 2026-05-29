import React, { useState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StandingRow {
  team_name: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  difference: number;
  points: number;
}

interface ShareStandingsProps {
  tournamentName: string;
  divisionName?: string;
  standings: StandingRow[];
}

export function ShareStandings({ tournamentName, divisionName, standings }: ShareStandingsProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleShare = async () => {
    if (isGenerating) return;
    setIsGenerating(true);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1350;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not get canvas context");

      // Background
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, 1080, 1350);

      // Draw Header
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "italic 900 50px system-ui, -apple-system, sans-serif";
      ctx.textBaseline = "top";
      ctx.fillText(tournamentName.toUpperCase(), 60, 60);

      let currentY = 60 + 50 + 20;

      if (divisionName) {
        ctx.fillStyle = "#D4AF37";
        ctx.font = "bold 36px system-ui, -apple-system, sans-serif";
        ctx.fillText(divisionName.toUpperCase(), 60, currentY);
        currentY += 36 + 20;
      }

      // Yellow line
      ctx.fillStyle = "#D4AF37";
      ctx.fillRect(60, currentY, 120, 8);
      currentY += 8 + 60;

      // Draw Table Header
      ctx.font = "bold 30px system-ui, -apple-system, sans-serif";
      
      const columns = [
        { label: "POS", x: 60, align: "center", w: 80 },
        { label: "TEAM", x: 140, align: "left", w: 380 },
        { label: "P", x: 520, align: "center", w: 70 },
        { label: "W", x: 590, align: "center", w: 60 },
        { label: "D", x: 650, align: "center", w: 60 },
        { label: "L", x: 710, align: "center", w: 60 },
        { label: "GD", x: 770, align: "center", w: 100 },
        { label: "PTS", x: 870, align: "center", w: 150 }
      ];

      const drawTextBounded = (text: string, x: number, y: number, w: number, align: string) => {
        const _align = align as CanvasTextAlign;
        ctx.textAlign = _align;
        let px = x;
        if (align === "center") px = x + w / 2;
        else if (align === "right") px = x + w;
        ctx.fillText(text, px, y);
      };

      ctx.textBaseline = "middle";
      ctx.fillStyle = "#71717A";
      columns.forEach((col, i) => {
        if (col.label === "PTS") ctx.fillStyle = "#D4AF37";
        else ctx.fillStyle = "#71717A";
        drawTextBounded(col.label, col.x, currentY + 20, col.w, col.align);
      });
      ctx.textAlign = "left"; // reset

      currentY += 40;

      // Header bottom border
      ctx.fillStyle = "#18181B";
      ctx.fillRect(60, currentY, 960, 2);
      currentY += 24;

      // Draw Rows
      standings.slice(0, 10).forEach((s, idx) => {
        let bgStyle = "transparent";
        let leftBorder = "#18181B";
        let posText = "#A1A1AA";
        
        if (idx === 0) { leftBorder = "#D4AF37"; bgStyle = "rgba(212,175,55,0.1)"; posText = "#D4AF37"; }
        else if (idx === 1) { leftBorder = "#D4D4D8"; bgStyle = "rgba(212,212,216,0.1)"; posText = "#D4D4D8"; }
        else if (idx === 2) { leftBorder = "#CD7F32"; bgStyle = "rgba(205,127,50,0.1)"; posText = "#CD7F32"; }

        const rowHeight = 84;

        // Draw Row BG
        if (bgStyle !== "transparent") {
          ctx.fillStyle = bgStyle;
          ctx.fillRect(60, currentY, 960, rowHeight);
        }

        // Left Border
        ctx.fillStyle = leftBorder;
        ctx.fillRect(60, currentY, 8, rowHeight);

        // Row Outline
        ctx.strokeStyle = "#18181B";
        ctx.lineWidth = 1;
        ctx.strokeRect(60, currentY, 960, rowHeight);

        const textY = currentY + (rowHeight / 2);
        
        // POS
        ctx.font = "900 32px system-ui, -apple-system, sans-serif";
        ctx.fillStyle = posText;
        drawTextBounded((idx + 1).toString(), columns[0].x, textY, columns[0].w, columns[0].align);

        // TEAM
        ctx.font = "bold 30px system-ui, -apple-system, sans-serif";
        ctx.fillStyle = "#FFFFFF";
        
        // Truncate team name if needed
        let teamName = s.team_name.toUpperCase();
        if (ctx.measureText(teamName).width > columns[1].w - 20) {
           while(teamName.length > 0 && ctx.measureText(teamName + "...").width > columns[1].w - 20) {
             teamName = teamName.slice(0, -1);
           }
           teamName += "...";
        }
        drawTextBounded(teamName, columns[1].x, textY, columns[1].w, columns[1].align);

        // Stats
        ctx.font = "500 28px system-ui, -apple-system, sans-serif";
        ctx.fillStyle = "#A1A1AA";
        drawTextBounded(s.played.toString(), columns[2].x, textY, columns[2].w, columns[2].align);
        drawTextBounded(s.wins.toString(), columns[3].x, textY, columns[3].w, columns[3].align);
        drawTextBounded(s.draws.toString(), columns[4].x, textY, columns[4].w, columns[4].align);
        drawTextBounded(s.losses.toString(), columns[5].x, textY, columns[5].w, columns[5].align);

        // GD
        ctx.font = "bold 28px system-ui, -apple-system, sans-serif";
        let gdColor = "#71717A";
        if (s.difference > 0) gdColor = "#10B981";
        else if (s.difference < 0) gdColor = "#EF4444";
        ctx.fillStyle = gdColor;
        drawTextBounded((s.difference > 0 ? "+" : "") + s.difference.toString(), columns[6].x, textY, columns[6].w, columns[6].align);

        // PTS
        ctx.font = "900 36px system-ui, -apple-system, sans-serif";
        ctx.fillStyle = "#D4AF37";
        drawTextBounded(s.points.toString(), columns[7].x, textY, columns[7].w, columns[7].align);

        currentY += rowHeight + 8; // gap
      });

      // Footer
      ctx.fillStyle = "#09090B";
      ctx.fillRect(0, 1350 - 80, 1080, 80);

      ctx.fillStyle = "#18181B";
      ctx.fillRect(0, 1350 - 82, 1080, 2);

      ctx.textBaseline = "middle";

      ctx.fillStyle = "#FFFFFF";
      ctx.textAlign = "left";
      ctx.font = "italic 900 32px system-ui, -apple-system, sans-serif";
      ctx.fillText("DVOC V2", 60, 1350 - 40);

      const titleWidth = ctx.measureText("DVOC V2").width;

      ctx.fillStyle = "#71717A";
      ctx.font = "500 32px system-ui, -apple-system, sans-serif";
      ctx.fillText(" | ", 60 + titleWidth, 1350 - 43);

      const sepWidth = ctx.measureText(" | ").width;

      ctx.fillStyle = "#D4AF37";
      ctx.font = "bold 28px system-ui, -apple-system, sans-serif";
      ctx.fillText("www.dvoctz.app", 60 + titleWidth + sepWidth, 1350 - 40);

      const dataUrl = canvas.toDataURL("image/png");

      try {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], `standings-${tournamentName.replace(/\s+/g, "-")}.png`, { type: "image/png" });

        if (navigator.share && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `${tournamentName} Standings`,
            files: [file],
          });
        } else {
          const link = document.createElement("a");
          link.download = `standings-${tournamentName.replace(/\s+/g, "-")}.png`;
          link.href = dataUrl;
          link.click();
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          const link = document.createElement("a");
          link.download = `standings-${tournamentName.replace(/\s+/g, "-")}.png`;
          link.href = dataUrl;
          link.click();
        }
      }
    } catch (error) {
      console.error("Failed to generate standings share image", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      onClick={handleShare}
      disabled={isGenerating}
      variant="outline"
      size="sm"
      className="border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-500 uppercase tracking-widest font-bold text-[10px] h-8 px-4"
    >
      <Share2 className="w-3 h-3 mr-2" />
      {isGenerating ? "Generating..." : "Share Standings"}
    </Button>
  );
}

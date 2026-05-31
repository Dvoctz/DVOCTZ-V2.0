import React, { useState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ShareFixtureData {
  date: string; // ISO date or formatted
  time: string; // display time
  unixTime: number; // for chronological sorting
  team1: string;
  team2: string;
  venue: string;
  officiatingTeam: string;
  tournamentName?: string;
  divisionName?: string;
  status: string; // "upcoming", "live", "completed"
  team1Score?: number | string;
  team2Score?: number | string;
  winner?: string;
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

  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleShare = async (mode: 'upcoming' | 'results' | 'schedule') => {
    if (isGenerating || fixtures.length === 0) return;
    setIsGenerating(true);
    setDropdownOpen(false);

    try {
      let filteredFixtures = fixtures.filter(f => {
         if (mode === 'upcoming') return f.status === 'upcoming' || f.status === 'live';
         if (mode === 'results') return f.status === 'completed';
         return true; // schedule (all)
      });

      // Sort chronologically
      filteredFixtures = filteredFixtures.sort((a, b) => a.unixTime - b.unixTime);

      if (filteredFixtures.length === 0) {
        setIsGenerating(false);
        return;
      }

      let cols = mode === 'results' ? 2 : 3;
      if (mode === 'results') {
         if (filteredFixtures.length <= 2) cols = 1;
      } else {
         if (filteredFixtures.length <= 2) cols = 1;
         else if (filteredFixtures.length <= 4) cols = 2; // For schedule, 4 items in 2 cols
      }

      const isMaxCols1 = cols === 1;
      const hdPad = isMaxCols1 ? 40 : 80;
      const gap = 24;
      const containerWidth = 1920 - (hdPad * 2);
      const cardWidth = Math.floor((containerWidth - (gap * (cols - 1))) / cols);

      const tCanvas = document.createElement("canvas");
      const tCtx = tCanvas.getContext("2d");
      if (!tCtx) throw new Error("Could not get canvas context");
      const getLines = (text, font, maxWidth) => {
          tCtx.font = font;
          const words = text.split(" ");
          const lines = []; let currentLine = "";
          for (let w = 0; w < words.length; w++) {
              const testLine = currentLine + words[w] + " ";
              if (tCtx.measureText(testLine).width > maxWidth && w > 0) {
                  lines.push(currentLine.trim()); currentLine = words[w] + " ";
              } else {
                  currentLine = testLine;
              }
          }
          if (currentLine.trim()) lines.push(currentLine.trim());
          return lines;
      };

      const drawRoundedRect = (ctx, x, y, width, height, radius) => {
          ctx.beginPath();
          ctx.moveTo(x + radius, y);
          ctx.lineTo(x + width - radius, y);
          ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
          ctx.lineTo(x + width, y + height - radius);
          ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
          ctx.lineTo(x + radius, y + height);
          ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
          ctx.lineTo(x, y + radius);
          ctx.quadraticCurveTo(x, y, x + radius, y);
          ctx.closePath();
      };

      const fixtureHeights = new Map();
      const maxTeamWidth = cardWidth - 40;
      const maxValWidth = cardWidth - 40;
      const teamFontSize = cols === 3 ? 32 : (cols === 2 ? 40 : 52);
      const teamLineHeight = teamFontSize + 6;

      for (const f of filteredFixtures) {
          let currentH = 15; // top pad
          currentH += 36; // Time block
          currentH += 15; // Gap
          
          const tFont = `900 ${teamFontSize}px system-ui, -apple-system, sans-serif`;
          const t1Lines = getLines(f.team1.toUpperCase(), tFont, maxTeamWidth);
          const t2Lines = getLines(f.team2.toUpperCase(), tFont, maxTeamWidth);
          
          currentH += (t1Lines.length * teamLineHeight);
          currentH += mode === 'results' ? 70 : 30; // VS gap
          currentH += (t2Lines.length * teamLineHeight);
          currentH += 15; // Gap after team 2

          if (mode === 'results') {
             currentH += 2; // divider line
             currentH += 20; // top gap inside footer
             currentH += 14; // "WINNER"
             currentH += 12; // gap
             currentH += 22; // Winner team text
             currentH += 20; // bottom pad
          } else {
             currentH += 16;
             const venueLines = getLines((f.venue || "TBA").trim(), "500 16px system-ui, -apple-system, sans-serif", maxValWidth);
             currentH += venueLines.length * 20;
             currentH += 18;
             const offLines = getLines((f.officiatingTeam || "TBA").trim(), "500 16px system-ui, -apple-system, sans-serif", maxValWidth);
             currentH += offLines.length * 20;
             currentH += 20;
          }
          fixtureHeights.set(f, currentH);
      }

      // Group by date
      const dateGroups = [];
      const tgMap = new Map();
      filteredFixtures.forEach(f => {
         if (!tgMap.has(f.date)) {
             tgMap.set(f.date, []);
             dateGroups.push({ date: f.date, fixtures: tgMap.get(f.date) });
         }
         tgMap.get(f.date).push(f);
      });

      const dateLayouts = [];
      for (const dg of dateGroups) {
         const rows = [];
         let totalH = 0;
         for (let i = 0; i < dg.fixtures.length; i += cols) {
             const rf = dg.fixtures.slice(i, i + cols);
             const mH = Math.max(...rf.map(f => fixtureHeights.get(f)));
             rows.push({ height: mH, fixtures: rf });
             totalH += mH + gap;
         }
         totalH -= gap; // trailing
         dateLayouts.push({ date: dg.date, rows, totalHeight: totalH });
      }

      const isSingleDate = dateGroups.length === 1;
      const pageBaseY = hdPad + (isMaxCols1 ? 52 : 64) + 12 + (isMaxCols1 ? 32 : 40) + (isMaxCols1 ? 25 : 40);
      const maxAvailableY = 1080 - pageBaseY - 60 - 30; // base available
      
      const pages = [];
      let currentGroups = [];
      let currentY = 0;

      for (const dl of dateLayouts) {
          const hdrH = isSingleDate ? 0 : 40 + gap;
          const dlH = hdrH + dl.totalHeight; 
          
          if (currentGroups.length > 0 && currentY + dlH > maxAvailableY) {
              pages.push(currentGroups);
              currentGroups = [];
              currentY = 0;
          }
          if (currentGroups.length === 0 && dlH > maxAvailableY) {
              // we must split this large date block
              let remaining = dl.rows;
              const requiredPages = Math.ceil(dlH / maxAvailableY);
              const targetH = dl.totalHeight / requiredPages; 
              
              while (remaining.length > 0) {
                  let partH = hdrH;
                  let cutIdx = 0;
                  // Fill page close to targetH to balance
                  while (cutIdx < remaining.length && partH + remaining[cutIdx].height <= maxAvailableY) {
                      partH += remaining[cutIdx].height + gap;
                      cutIdx++;
                      // Stop if we reached target height for balanced pagination
                      if (partH >= targetH + hdrH && remaining.length - cutIdx > 0 && requiredPages > 1) {
                          break;
                      }
                  }
                  if (cutIdx === 0) cutIdx = 1; 

                  const sliceRows = remaining.slice(0, cutIdx);
                  const sliceH = sliceRows.reduce((s, r) => s + r.height + gap, 0) - gap;
                  
                  if (cutIdx === remaining.length) {
                      currentGroups.push({ date: dl.date, rows: sliceRows, totalHeight: sliceH });
                      currentY += hdrH + sliceH + gap;
                  } else {
                      pages.push([{ date: dl.date, rows: sliceRows, totalHeight: sliceH }]);
                  }
                  remaining = remaining.slice(cutIdx);
              }
          } else {
              currentGroups.push(dl);
              currentY += dlH + gap;
          }
      }
      if (currentGroups.length > 0) pages.push(currentGroups);

      const generatedFiles = [];

      for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
        const pageLayouts = pages[pageIndex];

        const canvas = document.createElement("canvas");
        canvas.width = 1920;
        canvas.height = 1080;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Could not get canvas context");

        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, 1920, 1080);

        const pageFixtures = pageLayouts.flatMap(dl => dl.rows.flatMap(r => r.fixtures));
        const firstFixture = pageFixtures[0];
        
        ctx.fillStyle = "#FFFFFF";
        ctx.font = `900 ${isMaxCols1 ? 52 : 64}px system-ui, -apple-system, sans-serif`;
        ctx.textBaseline = "top";
        ctx.textAlign = "left";
        
        const tName = firstFixture.tournamentName ? firstFixture.tournamentName.toUpperCase() : contextName.toUpperCase();
        const dName = firstFixture.divisionName ? firstFixture.divisionName.toUpperCase() : "";
        const titleText = (dName && !tName.includes(dName)) ? `${tName} (${dName})` : tName;
        
        ctx.fillText(titleText, hdPad, hdPad, pages.length > 1 ? (1920 - hdPad - 200) : (1920 - hdPad * 2));

        const uniqueDates = Array.from(new Set(pageFixtures.map(f => f.date)));
        const isSinglePageDate = uniqueDates.length === 1;
        let subtitleText = isSinglePageDate ? uniqueDates[0].toUpperCase() : "TOURNAMENT FIXTURES";
        if (mode === 'results') subtitleText = isSinglePageDate ? `${uniqueDates[0].toUpperCase()} - MATCH RESULTS` : "MATCH RESULTS";
        else if (mode === 'upcoming') subtitleText = isSinglePageDate ? uniqueDates[0].toUpperCase() : "UPCOMING FIXTURES";
        else if (mode === 'schedule') subtitleText = "FULL TOURNAMENT SCHEDULE";
        
        ctx.fillStyle = "#D4AF37";
        ctx.font = `bold ${isMaxCols1 ? 32 : 40}px system-ui, -apple-system, sans-serif`;
        ctx.fillText(subtitleText, hdPad, hdPad + (isMaxCols1 ? 52 : 64) + 12);

        if (pages.length > 1) {
          ctx.fillStyle = "rgba(212, 175, 55, 0.1)"; 
          ctx.strokeStyle = "rgba(212, 175, 55, 0.3)";
          drawRoundedRect(ctx, 1920 - hdPad - 160, hdPad, 160, 50, 8);
          ctx.fill(); ctx.stroke();
          
          ctx.fillStyle = "#D4AF37";
          ctx.font = "bold 24px system-ui, -apple-system, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(`PART ${pageIndex + 1}/${pages.length}`, 1920 - hdPad - 80, hdPad + 25);
        }

        let pY = pageBaseY;

        for (const dl of pageLayouts) {
           if (!isSingleDate) {
              ctx.fillStyle = "#18181B";
              ctx.fillRect(hdPad, pY, containerWidth, 40);
              ctx.fillStyle = "#D4AF37";
              ctx.fillRect(hdPad, pY, 6, 40);
              
              ctx.textAlign = "left";
              ctx.textBaseline = "middle";
              ctx.font = "bold 24px system-ui, -apple-system, sans-serif";
              ctx.fillStyle = "#FFFFFF";
              ctx.fillText(dl.date.toUpperCase(), hdPad + 20, pY + 20);
              
              pY += 40 + gap;
           }

           for (const row of dl.rows) {
               for (let colIndex = 0; colIndex < row.fixtures.length; colIndex++) {
                   const f = row.fixtures[colIndex];
                   const cardHeight = row.height;
                   const x = hdPad + (colIndex * cardWidth) + (colIndex * gap);
                   const y = pY;

                   ctx.fillStyle = "rgba(9, 9, 11, 0.9)";
                   drawRoundedRect(ctx, x, y, cardWidth, cardHeight, 16);
                   ctx.fill();
                   ctx.strokeStyle = "rgba(212, 175, 55, 0.3)";
                   ctx.lineWidth = 1.5;
                   ctx.stroke();

                   const innerX = x + 20;
                   const innerY = y + 15;

                   ctx.fillStyle = "rgba(212, 175, 55, 0.1)"; 
                   ctx.strokeStyle = "rgba(212, 175, 55, 0.2)"; 
                   drawRoundedRect(ctx, innerX, innerY, 130, 36, 6);
                   ctx.fill();
                   ctx.stroke();

                   ctx.fillStyle = "#D4AF37";
                   ctx.font = "900 20px system-ui, -apple-system, sans-serif";
                   ctx.textAlign = "center";
                   ctx.textBaseline = "middle";
                   if (mode === 'results') {
                     ctx.fillText("COMPLETED", innerX + 65, innerY + 18);
                   } else {
                     ctx.fillText(f.time, innerX + 65, innerY + 18);
                   }

                   let currentH = 15 + 36 + 15;
                   const tFont = `900 ${teamFontSize}px system-ui, -apple-system, sans-serif`;
                   const t1Lines = getLines(f.team1.toUpperCase(), tFont, maxTeamWidth);
                   const t2Lines = getLines(f.team2.toUpperCase(), tFont, maxTeamWidth);
                   
                   const vsGap = mode === 'results' ? 70 : 30;
                   const totalTextHeight = (t1Lines.length * teamLineHeight) + vsGap + (t2Lines.length * teamLineHeight);
                   
                   let textStartY = innerY + 36 + 15 + (teamLineHeight / 2);
                   
                   ctx.fillStyle = (mode === 'results' && f.winner === f.team1) ? "#D4AF37" : "#FFFFFF";
                   for (const line of t1Lines) {
                        ctx.fillText(line, x + cardWidth / 2, textStartY);
                        textStartY += teamLineHeight;
                   }
                   
                   textStartY = textStartY - (teamLineHeight / 2) + (vsGap / 2);
                   ctx.fillStyle = "#D4AF37"; 
                   if (mode === 'results') {
                      ctx.font = `900 ${teamFontSize > 40 ? 64 : 52}px system-ui, -apple-system, sans-serif`;
                      ctx.fillText(`${f.team1Score ?? 0} : ${f.team2Score ?? 0}`, x + cardWidth / 2, textStartY);
                   } else {
                      ctx.font = `italic 900 20px system-ui, -apple-system, sans-serif`;
                      ctx.fillText("VS", x + cardWidth / 2, textStartY);
                   }
                   
                   textStartY = textStartY + (vsGap / 2) + (teamLineHeight / 2);
                   
                   ctx.fillStyle = (mode === 'results' && f.winner === f.team2) ? "#D4AF37" : "#FFFFFF";
                   ctx.font = tFont;
                   for (const line of t2Lines) {
                        ctx.fillText(line, x + cardWidth / 2, textStartY);
                        textStartY += teamLineHeight;
                   }

                   if (mode === 'results') {
                      const footerY = y + cardHeight - 88;
                      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
                      ctx.beginPath();
                      ctx.moveTo(x + 20, footerY);
                      ctx.lineTo(x + cardWidth - 20, footerY);
                      ctx.stroke();

                      const footerCenterY = footerY + 20 + 20; 
                      ctx.textAlign = "center";
                      ctx.textBaseline = "middle";
                      ctx.fillStyle = "#71717A";
                      ctx.font = "bold 14px system-ui, -apple-system, sans-serif";
                      ctx.fillText("WINNER", x + cardWidth / 2, footerY + 20);
                      
                      ctx.fillStyle = "#D4AF37";
                      ctx.font = "900 22px system-ui, -apple-system, sans-serif";
                      
                      const winnerText = f.winner ? f.winner.toUpperCase() : "DRAW";
                      let winFontSize = 22;
                      ctx.font = `900 ${winFontSize}px system-ui, -apple-system, sans-serif`;
                      if (ctx.measureText(winnerText).width > maxValWidth) {
                         winFontSize = 16;
                         ctx.font = `900 ${winFontSize}px system-ui, -apple-system, sans-serif`;
                      }
                      
                      ctx.fillText(winnerText, x + cardWidth / 2, footerY + 46);
                   } else {
                      // Schedule
                      // Space after team 2 is 15
                      let dataY = textStartY - (teamLineHeight / 2) + 15;
                      
                      ctx.textAlign = "left";
                      ctx.textBaseline = "top";
                      ctx.fillStyle = "#71717A";
                      ctx.font = "bold 12px system-ui, -apple-system, sans-serif";
                      ctx.fillText("VENUE:", x + 20, dataY);
                      
                      ctx.fillStyle = "#D4D4D8";
                      ctx.font = "500 16px system-ui, -apple-system, sans-serif";
                      const venueLines = getLines((f.venue || "TBA").trim(), "500 16px system-ui, -apple-system, sans-serif", maxValWidth);
                      dataY += 16;
                      for (const l of venueLines) {
                          ctx.fillText(l, x + 20, dataY);
                          dataY += 20;
                      }

                      dataY += 18;
                      ctx.fillStyle = "#71717A";
                      ctx.font = "bold 12px system-ui, -apple-system, sans-serif";
                      ctx.fillText("OFFICIATING:", x + 20, dataY);
                      
                      ctx.fillStyle = "#D4D4D8";
                      ctx.font = "500 16px system-ui, -apple-system, sans-serif";
                      const offLines = getLines((f.officiatingTeam || "TBA").trim(), "500 16px system-ui, -apple-system, sans-serif", maxValWidth);
                      dataY += 16;
                      for (const l of offLines) {
                          ctx.fillText(l, x + 20, dataY);
                          dataY += 20;
                      }
                   }
               }
               pY += row.height + gap;
           }
        }

        ctx.fillStyle = "#09090B";
        ctx.fillRect(0, 1080 - 60, 1920, 60);

        ctx.fillStyle = "#18181B";
        ctx.fillRect(0, 1080 - 62, 1920, 2);

        ctx.textBaseline = "middle";

        ctx.fillStyle = "#FFFFFF";
        ctx.textAlign = "left";
        ctx.font = "italic 900 28px system-ui, -apple-system, sans-serif";
        ctx.fillText("DVOC V2", hdPad, 1080 - 30);

        const titleWidth = ctx.measureText("DVOC V2").width;

        ctx.fillStyle = "#71717A";
        ctx.font = "500 28px system-ui, -apple-system, sans-serif";
        ctx.fillText(" | ", hdPad + titleWidth, 1080 - 32);

        const sepWidth = ctx.measureText(" | ").width;

        ctx.fillText("OFFICIAL LEAGUE PLATFORM", hdPad + titleWidth + sepWidth, 1080 - 30);

        ctx.fillStyle = "#D4AF37";
        ctx.textAlign = "right";
        ctx.font = "bold 24px system-ui, -apple-system, sans-serif";
        ctx.fillText("www.dvoctz.app", 1920 - hdPad, 1080 - 30);

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
    <div className="relative inline-block text-left z-50">
      <Button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        disabled={isGenerating}
        variant="outline"
        size="sm"
        className="border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-500 uppercase tracking-widest font-bold text-[10px] h-8 px-4 relative z-50"
      >
        <Share2 className="w-3 h-3 mr-2" />
        {isGenerating ? "Generating..." : "Share Fixtures"}
      </Button>
      
      {dropdownOpen && !isGenerating && (
         <div className="absolute right-0 top-full mt-2 w-48 bg-zinc-950 border border-zinc-800 rounded-sm shadow-2xl py-1 flex flex-col z-[100] transform transition-all origin-top-right">
           <button onClick={() => handleShare('upcoming')} className="px-4 py-3 text-left text-[10px] uppercase font-bold text-zinc-400 hover:text-amber-500 hover:bg-zinc-900 border-b border-zinc-800/50 transition-colors w-full tracking-widest">Share Upcoming</button>
           <button onClick={() => handleShare('results')} className="px-4 py-3 text-left text-[10px] uppercase font-bold text-zinc-400 hover:text-amber-500 hover:bg-zinc-900 border-b border-zinc-800/50 transition-colors w-full tracking-widest">Share Results</button>
           <button onClick={() => handleShare('schedule')} className="px-4 py-3 text-left text-[10px] uppercase font-bold text-zinc-400 hover:text-amber-500 hover:bg-zinc-900 transition-colors w-full tracking-widest">Share Full Schedule</button>
         </div>
      )}
    </div>
  );
}

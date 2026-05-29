import React, { useRef, useState } from "react";
import html2canvas from "html2canvas";
import { Share2, Download } from "lucide-react";
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
  const containerRef = useRef<HTMLDivElement>(null);

  const handleShare = async () => {
    if (!containerRef.current || isGenerating) return;
    setIsGenerating(true);

    try {
      // Temporarily unhide the container
      containerRef.current.style.display = "block";

      const nodeToRender = containerRef.current.firstElementChild as HTMLElement;

      const canvas = await html2canvas(nodeToRender, {
        scale: 2,
        backgroundColor: "#000000",
        useCORS: true,
      });

      // Hide it back
      containerRef.current.style.display = "none";

      const dataUrl = canvas.toDataURL("image/png");

      try {
        // Try native share if on mobile / supported environment
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], `standings-${tournamentName.replace(/\s+/g, "-")}.png`, { type: "image/png" });

        if (navigator.share && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `${tournamentName} Standings`,
            files: [file],
          });
        } else {
          // Fallback to download
          const link = document.createElement("a");
          link.download = `standings-${tournamentName.replace(/\s+/g, "-")}.png`;
          link.href = dataUrl;
          link.click();
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          // If share was canceled, don't download. If other error, fallback to download.
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

  const TopStyling = (index: number) => {
    if (index === 0) return { accent: "border-[#D4AF37]", styleBg: "rgba(212,175,55,0.1)", text: "text-[#D4AF37]" };
    if (index === 1) return { accent: "border-[#D4D4D8]", styleBg: "rgba(212,212,216,0.1)", text: "text-[#D4D4D8]" };
    if (index === 2) return { accent: "border-[#CD7F32]", styleBg: "rgba(205,127,50,0.1)", text: "text-[#CD7F32]" };
    return { accent: "border-[#27272A]", styleBg: "transparent", text: "text-[#A1A1AA]" };
  };

  return (
    <>
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

      {/* Hidden container for rendering */}
      <div 
        ref={containerRef} 
        style={{ display: "none" }}
        className="absolute top-[-9999px] left-[-9999px]"
      >
        <div 
          className="w-[1080px] h-[1350px] bg-[#000000] text-[#FFFFFF] relative font-sans overflow-hidden flex flex-col justify-between"
          style={{ width: '1080px', height: '1350px' }}
        >
          <div className="absolute inset-0 z-0" style={{ background: 'radial-gradient(ellipse at top right, rgba(212,175,55,0.15), #000000 50%, #000000 100%)', opacity: 0.6 }}></div>

          <div className="relative z-10 w-full flex-1 p-[60px] pb-[40px] flex flex-col">
            <div className="mb-8 shrink-0">
              <h1 className="text-[40px] font-black italic tracking-tighter uppercase text-[#FFFFFF] leading-none">
                {tournamentName}
              </h1>
              {divisionName && (
                <h2 className="text-[28px] font-bold tracking-widest uppercase text-[#D4AF37] mt-3">
                  {divisionName}
                </h2>
              )}
              <div className="w-24 h-2 bg-[#D4AF37] mt-4"></div>
            </div>

            <div className="w-full flex-1 flex flex-col">
              {/* Table Header */}
              <div className="grid grid-cols-[8%_42%_7%_7%_7%_7%_10%_12%] gap-2 pb-4 border-b-2 border-[#18181B] text-[#71717A] font-bold uppercase tracking-widest text-[24px]">
                <div className="text-center">Pos</div>
                <div>Team</div>
                <div className="text-center">P</div>
                <div className="text-center">W</div>
                <div className="text-center">D</div>
                <div className="text-center">L</div>
                <div className="text-center">GD</div>
                <div className="text-center text-[#D4AF37]">Pts</div>
              </div>

              {/* Table Rows */}
              <div className="mt-4 flex flex-col gap-3 flex-1 overflow-hidden">
                {standings.map((s, idx) => {
                  const style = TopStyling(idx);
                  return (
                    <div 
                      key={idx} 
                      className={`grid grid-cols-[8%_42%_7%_7%_7%_7%_10%_12%] gap-2 items-center py-5 border-l-4 ${style.accent} px-4 border-y border-r border-[#18181B] text-[28px]`}
                      style={{ backgroundColor: style.styleBg }}
                    >
                      <div className={`text-center font-black ${style.text}`}>{idx + 1}</div>
                      <div className="font-bold text-[#FFFFFF] uppercase tracking-wider leading-tight pr-2 break-words text-[26px]">
                        {s.team_name}
                      </div>
                      <div className="text-center text-[#A1A1AA] font-medium">{s.played}</div>
                      <div className="text-center text-[#A1A1AA] font-medium">{s.wins}</div>
                      <div className="text-center text-[#A1A1AA] font-medium">{s.draws}</div>
                      <div className="text-center text-[#A1A1AA] font-medium">{s.losses}</div>
                      <div className={`text-center font-bold ${s.difference > 0 ? "text-[#10B981]" : s.difference < 0 ? "text-[#EF4444]" : "text-[#71717A]"}`}>
                        {s.difference > 0 ? "+" : ""}{s.difference}
                      </div>
                      <div className="text-center font-black text-[#D4AF37]">{s.points}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="relative z-10 bg-[#09090B] border-t-2 border-[#18181B] flex justify-between items-center px-[60px] py-[30px] shrink-0">
            <div>
              <h3 className="text-[32px] font-black italic tracking-tighter uppercase text-[#FFFFFF]">DVOC V2</h3>
              <p className="text-[20px] uppercase font-bold tracking-widest text-[#71717A] mt-1">Official League Platform</p>
            </div>
            <div className="text-right">
              <p className="text-[20px] uppercase font-bold tracking-widest text-[#71717A] mb-1">Full statistics available at</p>
              <p className="text-[24px] font-bold text-[#D4AF37]">www.dvoctz.app</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

import React, { useRef, useState } from "react";
import html2canvas from "html2canvas";
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
  const containerRef = useRef<HTMLDivElement>(null);

  const handleShare = async () => {
    if (!containerRef.current || isGenerating || fixtures.length === 0) return;
    setIsGenerating(true);

    try {
      containerRef.current.style.display = "block";

      const MAX_PER_PAGE = 6;
      const totalPages = Math.ceil(fixtures.length / MAX_PER_PAGE);

      const generatedFiles: File[] = [];

      for (let page = 0; page < totalPages; page++) {
        // Find the page container
        const pageNode = document.getElementById(`share-fixtures-page-${page}`);
        if (!pageNode) continue;

        const canvas = await html2canvas(pageNode, {
          scale: 2,
          backgroundColor: "#000000",
          useCORS: true,
        });

        const dataUrl = canvas.toDataURL("image/png");
        const blob = await (await fetch(dataUrl)).blob();
        
        const fileName = totalPages > 1 
          ? `fixtures-${contextName.replace(/\s+/g, "-")}-pt${page + 1}.png`
          : `fixtures-${contextName.replace(/\s+/g, "-")}.png`;

        generatedFiles.push(new File([blob], fileName, { type: "image/png" }));
      }

      containerRef.current.style.display = "none";

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
      if (containerRef.current) containerRef.current.style.display = "none";
    } finally {
      setIsGenerating(false);
    }
  };

  const MAX_PER_PAGE = 6;
  const pages = [];
  for (let i = 0; i < fixtures.length; i += MAX_PER_PAGE) {
    pages.push(fixtures.slice(i, i + MAX_PER_PAGE));
  }

  if (fixtures.length === 0) return null;

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
        {isGenerating ? "Generating..." : "Share Fixtures"}
      </Button>

      {/* Hidden container for rendering */}
      <div 
        ref={containerRef} 
        style={{ display: "none" }}
        className="absolute top-[-9999px] left-[-9999px]"
      >
        {pages.map((pageFixtures, pageIndex) => {
          // Group page fixtures by Date string
          const groupedByDate: Record<string, ShareFixtureData[]> = {};
          pageFixtures.forEach(f => {
            if (!groupedByDate[f.date]) groupedByDate[f.date] = [];
            groupedByDate[f.date].push(f);
          });

          return (
            <div 
              key={pageIndex}
              id={`share-fixtures-page-${pageIndex}`}
              className="w-[1080px] h-[1350px] bg-[#000000] text-[#FFFFFF] relative font-sans overflow-hidden flex flex-col justify-between"
              style={{ width: '1080px', height: '1350px' }} // enforce inline bounds for html2canvas
            >
              <div className="absolute inset-0 z-0" style={{ background: 'radial-gradient(ellipse at top right, rgba(212,175,55,0.15), #000000 50%, #000000 100%)', opacity: 0.6 }}></div>

              <div className="relative z-10 w-full flex-1 p-[60px] pb-[40px] flex flex-col">
                {/* Header */}
                <div className="mb-8 flex justify-between items-end shrink-0">
                  <div>
                    <h1 className="text-[48px] font-black italic tracking-tighter uppercase text-[#FFFFFF] leading-none">
                      {contextName}
                    </h1>
                    <div className="w-24 h-2 bg-[#D4AF37] mt-6"></div>
                  </div>
                  {pages.length > 1 && (
                    <div className="text-[24px] uppercase tracking-widest text-[#71717A] font-bold mb-2">
                       Part {pageIndex + 1}/{pages.length}
                    </div>
                  )}
                </div>

                {/* Fixtures List */}
                <div className="flex-1 flex flex-col justify-start">
                  {Object.entries(groupedByDate).map(([dateStr, dateFixtures]) => (
                    <div key={dateStr} className="mb-6 last:mb-0">
                      <div className="bg-[#18181B] border-l-4 border-[#D4AF37] px-4 py-2 mb-4 w-full">
                         <h2 className="text-[28px] font-bold tracking-widest uppercase text-[#D4AF37]">
                           {dateStr}
                         </h2>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        {dateFixtures.map((f, fIdx) => (
                          <div key={fIdx} className="border border-[#18181B] p-5 rounded-md flex flex-col" style={{ backgroundColor: 'rgba(9,9,11,0.8)' }}>
                             <div className="flex justify-between items-start mb-4">
                                <span className="text-[24px] font-black text-[#D4AF37] px-3 border" style={{ backgroundColor: 'rgba(212,175,55,0.1)', borderColor: 'rgba(212,175,55,0.2)' }}>{f.time}</span>
                                <div className="text-right">
                                  {f.tournamentName && (
                                    <span className="block text-[14px] uppercase font-bold text-[#A1A1AA] tracking-widest">{f.tournamentName}</span>
                                  )}
                                  {f.divisionName && (
                                    <span className="block text-[14px] uppercase font-bold text-[#71717A] tracking-widest">{f.divisionName}</span>
                                  )}
                                </div>
                             </div>
                             
                             <div className="flex-1 flex flex-col items-center justify-center text-center my-2">
                               <span className="text-[24px] font-black uppercase text-[#FFFFFF] leading-tight w-full truncate">{f.team1}</span>
                               <span className="text-[16px] font-bold italic text-[#52525B] my-1">VS</span>
                               <span className="text-[24px] font-black uppercase text-[#FFFFFF] leading-tight w-full truncate">{f.team2}</span>
                             </div>

                             <div className="mt-4 border-t border-[#18181B] pt-3 flex justify-between items-end">
                                <div>
                                  <span className="block text-[14px] text-[#71717A] uppercase tracking-widest font-bold">Venue</span>
                                  <span className="block text-[18px] text-[#D4D4D8] font-medium truncate">{f.venue || "TBA"}</span>
                                </div>
                                <div className="text-right">
                                  <span className="block text-[14px] text-[#71717A] uppercase tracking-widest font-bold">Officiating</span>
                                  <span className="block text-[18px] text-[#D4D4D8] font-medium truncate">{f.officiatingTeam || "TBA"}</span>
                                </div>
                             </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="relative z-10 bg-[#09090B] border-t-2 border-[#18181B] flex justify-between items-center px-[60px] py-[30px] shrink-0">
                <div>
                  <h3 className="text-[32px] font-black italic tracking-tighter uppercase text-[#FFFFFF]">DVOC V2</h3>
                  <p className="text-[20px] uppercase font-bold tracking-widest text-[#71717A] mt-1">Official League Platform</p>
                </div>
                <div className="text-right">
                  <p className="text-[24px] font-bold text-[#D4AF37]">www.dvoctz.app</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

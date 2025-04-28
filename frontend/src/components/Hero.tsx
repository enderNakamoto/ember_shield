"use client";

import { FaFire, FaShieldAlt } from "react-icons/fa";
import { BiTrendingUp } from "react-icons/bi";
import { MdOutlineEmergency, MdLocationOn } from "react-icons/md";
import { RiFireLine } from "react-icons/ri";
import { useEffect, useState } from "react";
import { ASSET_SYMBOL } from "@/contract/asset";
import { APP_NAME } from "@/config/app";

export const Hero = () => {
  const headlines = [
    "Protect Against Wildfires",
    "Wildfire Insurance Everywhere",
    "Shield Your Assets From Fire",
    "Rapid Wildfire Protection",
  ];

  const [currentHeadline, setCurrentHeadline] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentHeadline((prev) => (prev + 1) % headlines.length);
        setIsVisible(true);
      }, 1000);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative min-h-screen pt-16 pb-32 flex flex-col items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.3)_0%,rgba(255,255,255,0.8)_100%)] dark:bg-[linear-gradient(180deg,rgba(0,0,0,0.3)_0%,rgba(0,0,0,0.8)_100%)]" />

      <div className="absolute inset-0 overflow-hidden">
        <div className="random-float left-[10%] top-[20%]">
          <FaFire className="h-12 w-12 text-[#FF6B00]" />
        </div>
        <div className="random-float left-[80%] top-[30%] animation-delay-2000">
          <FaShieldAlt className="h-10 w-10 text-primary" />
        </div>
        <div className="random-float left-[20%] top-[70%] animation-delay-1000">
          <RiFireLine className="h-14 w-14 text-accent" />
        </div>
        <div className="random-float left-[65%] top-[65%] animation-delay-3000">
          <MdOutlineEmergency className="h-12 w-12 text-[#FF3D00]" />
        </div>
        <div className="random-float left-[40%] top-[25%] animation-delay-4000">
          <MdLocationOn className="h-12 w-12 text-[#FF9D00]" />
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
        <div className="mb-8 relative">
          <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-accent/20 rounded-full blur-xl" />
          <FaShieldAlt className="relative mx-auto h-20 w-20 text-primary" />
        </div>

        <h1
          className={`py-6 text-5xl sm:text-6xl md:text-7xl font-bold mb-8 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent relative z-20 drop-shadow-lg transition-all duration-1000 ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          {headlines[currentHeadline]}
        </h1>

        <p className="animate-slide-up delay-100 text-xl text-gray-600 dark:text-gray-300 mb-12 max-w-2xl mx-auto">
          Decentralized wildfire insurance protection powered by {ASSET_SYMBOL}.
          Secure your assets with {APP_NAME} against the growing threat of wildfires.
        </p>

        <div className="flex flex-wrap justify-center gap-6 animate-slide-up delay-200">
          <div className="group flex items-center space-x-3 bg-gradient-to-br from-card/80 to-white/80 dark:from-gray-800/80 dark:to-gray-900/80 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="relative">
              <div className="absolute -inset-2 bg-gradient-to-r from-primary/20 to-accent/20 rounded-full blur-md group-hover:bg-primary/30 transition-all duration-300" />
              <RiFireLine className="relative h-8 w-8 text-primary" />
            </div>
            <span className="text-lg font-medium text-gray-700 dark:text-gray-200">
              Wildfire Risk Protection
            </span>
          </div>
          <div className="group flex items-center space-x-3 bg-gradient-to-br from-card/80 to-white/80 dark:from-gray-800/80 dark:to-gray-900/80 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="relative">
              <div className="absolute -inset-2 bg-gradient-to-r from-primary/20 to-accent/20 rounded-full blur-md group-hover:bg-primary/30 transition-all duration-300" />
              <FaShieldAlt className="relative h-8 w-8 text-primary" />
            </div>
            <span className="text-lg font-medium text-gray-700 dark:text-gray-200">
              {ASSET_SYMBOL} Backed Coverage
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

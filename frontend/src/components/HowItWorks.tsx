"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { DialogContent } from "@/components/ui/dialog";
import { BiPlayCircle } from "react-icons/bi";
import { DialogTitle } from "@radix-ui/react-dialog";
import { ASSET_SYMBOL } from "@/contract/asset";
import { APP_NAME } from "@/config/app";
import { FaFire, FaShieldAlt, FaMoneyBillWave } from "react-icons/fa";

export const HowItWorks = () => {
  const [showVideo, setShowVideo] = useState(false);

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
          How {APP_NAME} Works
        </h2>

        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="bg-card rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <FaFire className="text-accent h-5 w-5" />
                <h3 className="text-xl font-semibold text-accent">
                  Wildfire Detection
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-300">
                Our platform uses real-time fire detection data from trusted oracles to monitor wildfire events globally.
              </p>
            </div>

            <div className="bg-card rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <FaShieldAlt className="text-accent h-5 w-5" />
                <h3 className="text-xl font-semibold text-accent">
                  Smart Contract Protection
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-300">
                Secure insurance coverage through blockchain smart contracts that automatically trigger payouts when wildfires are detected.
              </p>
            </div>

            <div className="bg-card rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <FaMoneyBillWave className="text-accent h-5 w-5" />
                <h3 className="text-xl font-semibold text-accent">
                  {ASSET_SYMBOL} Backed Coverage
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-300">
                Use your {ASSET_SYMBOL} tokens to secure coverage or provide liquidity to the wildfire insurance markets.
              </p>
            </div>
          </div>

          <div
            className="relative group cursor-pointer"
            onClick={() => setShowVideo(true)}
          >
            <div className="relative rounded-2xl overflow-hidden shadow-xl">
              <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <BiPlayCircle className="w-20 h-20 text-white drop-shadow-lg transition-transform group-hover:scale-110" />
              </div>
              <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors" />
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showVideo} onOpenChange={setShowVideo}>
        <DialogTitle className="text-transparent">Video</DialogTitle>
        <DialogContent className="max-w-4xl p-0">
          <div className="aspect-video">
            <iframe
              className="w-full h-full"
              src="https://www.youtube.com/embed/EcJ1rvtiQVA"
              title="Wildfire Insurance Explainer"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};

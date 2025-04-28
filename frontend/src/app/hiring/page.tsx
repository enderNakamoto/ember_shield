"use client";

import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { ASSET_SYMBOL } from "@/contract/asset";
import { APP_NAME } from "@/config/app";

const Hiring = () => {
  const handleClick = () => {
    window.open("https://github.com/enderNakamoto", "_blank");
  };
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <div className="container max-w-5xl mx-auto px-4 py-16 flex-1">
        <h1 className="text-4xl font-bold mb-8 mt-12 text-center">
          Join Our Team
        </h1>

        <div className="grid md:grid-cols-2 gap-12 items-center mb-12">
          <div>
            <div className="bg-secondary rounded-lg p-8 shadow-lg">
              <h2 className="text-2xl font-semibold mb-4">
                We're Growing Fast
              </h2>
              <p className="text-gray-700 mb-6">
                {APP_NAME} is building the future of crypto hedging with{" "}
                {ASSET_SYMBOL}. We're looking for passionate individuals who
                want to make an impact in the world of decentralized finance.
              </p>

              <h3 className="text-xl font-medium mb-3">
                We're actively hiring:
              </h3>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-primary mr-2"></div>
                  <span>Experienced Software Engineers</span>
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-primary mr-2"></div>
                  <span>UI/UX Designers</span>
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-primary mr-2"></div>
                  <span>QA Testers</span>
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-primary mr-2"></div>
                  <span>Marketing Specialists</span>
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-primary mr-2"></div>
                  <span>Product Managers</span>
                </li>
              </ul>

              <Button className="w-full" onClick={handleClick}>
                Apply Now <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Why Work With Us</h2>

            <div className="grid gap-4">
              <div className="p-4 border border-gray-200 rounded-lg">
                <h3 className="font-medium text-lg mb-2">
                  Cutting-Edge Technology
                </h3>
                <p className="text-gray-600">
                  Work with the latest technologies in blockchain and DeFi
                </p>
              </div>

              <div className="p-4 border border-gray-200 rounded-lg">
                <h3 className="font-medium text-lg mb-2">
                  Remote-First Culture
                </h3>
                <p className="text-gray-600">
                  Work from anywhere in the world with flexible hours
                </p>
              </div>

              <div className="p-4 border border-gray-200 rounded-lg">
                <h3 className="font-medium text-lg mb-2">
                  Competitive Compensation
                </h3>
                <p className="text-gray-600">
                  Attractive salary packages with token incentives
                </p>
              </div>

              <div className="p-4 border border-gray-200 rounded-lg">
                <h3 className="font-medium text-lg mb-2">
                  Growth Opportunities
                </h3>
                <p className="text-gray-600">
                  Join a fast-growing startup with plenty of room for
                  advancement
                </p>
              </div>
            </div>

            <div className="pt-4">
              <p className="text-gray-700">
                Don't see a position that fits your skills? We're always looking
                for talented individuals. Feel free to contact us at{" "}
                <a
                  href="https://github.com/enderNakamoto"
                  target="_blank"
                  className="text-primary hover:underline"
                >
                  https://github.com/enderNakamoto
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Hiring;

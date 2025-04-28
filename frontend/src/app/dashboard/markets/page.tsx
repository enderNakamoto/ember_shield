"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  FaWallet,
  FaChartLine,
  FaExchangeAlt,
  FaExternalLinkAlt,
} from "react-icons/fa";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardFooter } from "@/components/DashboardFooter";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import ReactConfetti from "react-confetti";
import { useToast } from "@/hooks/use-toast";
import { useAppKitAccount } from "@reown/appkit/react";
import { DashboardNavigation } from "@/components/DashboardNavigation";
import { useReadContract, useWriteContract } from "wagmi";
import { approveErc20ABI, balanceErc20ABI, vaultABI } from "@/contract/abi";
import { ASSET_ADDRESS, ASSET_DECIMALS, ASSET_SYMBOL } from "@/contract/asset";
import Link from "next/link";
import {
  Address,
  createPublicClient,
  formatUnits,
  http,
  parseUnits,
} from "viem";
import {
  allMarkets,
  baseEventDescriptionHedge,
  baseEventDescriptionRisk,
  oracle,
} from "@/contract/markets";
import { waitForTransactionReceipt } from "viem/actions";
import { ExternalLink } from "lucide-react";
import { customNetwork } from "@/contract/chain";

const Markets = () => {
  const { isConnected, address } = useAppKitAccount();
  const [marketStrategy, setMarketStrategy] = useState<"hedge" | "risk">(
    "hedge"
  );
  const [selectedContract, setSelectedContract] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [payout, setPayout] = useState("");
  const [amount, setAmount] = useState<number | null>(null);
  const [assetBalance, setAssetBalance] = useState<string>("");
  const [totalAssets, setTotalAssets] = useState<string>("");
  const [confetti, setConfetti] = useState(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [balanceTrigger, setBalanceTrigger] = useState<boolean>(false);
  const [marketId, setMarketId] = useState("-");
  const [vaultAddress, setVaultAddress] = useState("");
  const [factoryAddress, setFactoryAddress] = useState("");
  const [controllerAddress, setControllerAddress] = useState("");

  const { toast } = useToast();

  const {
    data: data1,
    isLoading: isLoading1,
    isError: isError1,
    refetch: refetch1,
  } = useReadContract({
    abi: balanceErc20ABI,
    address: ASSET_ADDRESS,
    functionName: "balanceOf",
    args: [address],
  });

  const {
    data: data2,
    isLoading: isLoading2,
    isError: isError2,
    refetch: refetch2,
  } = useReadContract({
    abi: vaultABI,
    address: selectedContract as Address,
    functionName: "totalAssets",
    args: [],
  });

  const { writeContractAsync } = useWriteContract();

  const client = createPublicClient({
    chain: customNetwork,
    transport: http(),
  });

  useEffect(() => {
    if (!isConnected) return;
    if (refetch1) {
      (async () => {
        try {
          const result = await refetch1();
          console.log("Balance fetch result:", result);
          if (result.isSuccess) {
            setAssetBalance(formatUnits(result.data as bigint, ASSET_DECIMALS));
          }
        } catch (error) {
          console.error("Error refetching wallet balance:", error);
        }
      })();
    }
  }, [address, isConnected, balanceTrigger]);

  useEffect(() => {
    if (!isConnected || !selectedContract) return;
    if (refetch2) {
      (async () => {
        try {
          const result = await refetch2();
          console.log("Assets fetch result:", result);
          if (result.isSuccess) {
            setTotalAssets(formatUnits(result.data as bigint, ASSET_DECIMALS));
          }
        } catch (error) {
          console.error("Error refetching assets:", error);
        }
      })();
    }
  }, [isConnected, selectedContract, balanceTrigger]);

  const handleDeposit = async () => {
    console.log("Depositing:", {
      side: marketStrategy,
      amount,
      selectedContract,
    });

    const result = await depositTokens();

    if (result) {
      setConfetti(true);
      toast({
        title: "Position created successfully",
        description: `You've deposited ${amount} ${ASSET_SYMBOL} on the ${marketStrategy} side.`,
      });
    } else {
      toast({
        title: "Failed",
        variant: "destructive",
        description: `Please check the console or contact developers.`,
      });
    }

    setBalanceTrigger(!balanceTrigger);
  };

  const depositTokens = async (): Promise<boolean> => {
    if (!amount) {
      console.log("Amount is not set");
      return false;
    }
    if (!isConnected || !address) {
      console.log("Address not connected");
      return false;
    }
    if (!selectedContract) {
      console.log("Contract not selected");
      return false;
    }
    setLoading(true);
    try {
      const value = parseUnits(amount.toString(), ASSET_DECIMALS);
      const txHashApprove = await writeContractAsync({
        abi: approveErc20ABI,
        address: ASSET_ADDRESS,
        functionName: "approve",
        args: [selectedContract, value],
      });
      const resultApprove = await waitForTransactionReceipt(client, {
        confirmations: 1,
        hash: txHashApprove,
      });
      console.log("approve done", resultApprove);
      const txHash = await writeContractAsync({
        abi: vaultABI,
        address: selectedContract as Address,
        functionName: "deposit",
        args: [value, address],
      });
      const result = await waitForTransactionReceipt(client, {
        confirmations: 1,
        hash: txHash,
      });
      console.log("deposit done", result);
      return true;
    } catch (error) {
      console.log("Error.", error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handlePercentageClick = (percentage: number) => {
    if (!assetBalance) return;
    const calculatedAmount = (Number(assetBalance) * percentage) / 100;
    setAmount(calculatedAmount);
  };

  useEffect(() => {
    if (confetti) {
      const timer = setTimeout(() => {
        setConfetti(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [confetti]);

  useEffect(() => {
    if (selectedContract) {
      if (marketStrategy === "hedge") {
        const market = allMarkets.find(
          (m) => m.HedgeAddress === selectedContract
        );
        if (market) {
          setEventDescription(market.HedgeEvent);
          setPayout(market.HedgePayment);
          setMarketId(market.MarketId.toString());
          setVaultAddress(selectedContract);
          setFactoryAddress(market.FactoryAddress);
          setControllerAddress(market.ControllerAddress);
        }
      } else {
        const market = allMarkets.find(
          (m) => m.RiskAddress === selectedContract
        );
        if (market) {
          setEventDescription(market.RiskEvent);
          setPayout(market.RiskPayment);
          setMarketId(market.MarketId.toString());
          setVaultAddress(selectedContract);
          setFactoryAddress(market.FactoryAddress);
          setControllerAddress(market.ControllerAddress);
        }
      }
    } else {
      setEventDescription(
        marketStrategy === "hedge"
          ? baseEventDescriptionHedge
          : baseEventDescriptionRisk
      );
      setPayout("");
      setMarketId("-");
      setVaultAddress("");
      setFactoryAddress("");
      setControllerAddress("");
    }
  }, [selectedContract, marketStrategy]);

  return (
    <div className="min-h-screen bg-secondary flex flex-col relative">
      {confetti && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <ReactConfetti
            width={window.innerWidth}
            height={window.innerHeight}
            recycle={false}
            numberOfPieces={500}
            colors={["#8B5CF6", "#D946EF", "#F97316", "#0EA5E9"]}
          />
        </div>
      )}

      <DashboardNavigation />

      {!isConnected && (
        <div className="my-20">
          <p className="text-center">Please connect your wallet first.</p>
        </div>
      )}
      {isConnected && (
        <SidebarProvider defaultOpen={false}>
          <div className="flex min-h-[calc(100vh-4rem)] w-full flex-1">
            <DashboardSidebar />
            <main className="flex-1 container mx-auto px-4 py-8 flex flex-col">
              <div className="mt-20"></div>

              <div className="grid gap-6 flex-1">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FaWallet className="text-primary" />
                        Wallet Balance
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold">
                        {assetBalance} {ASSET_SYMBOL}
                      </p>
                      <Link
                        href={"https://coston2-explorer.flare.network/address/" + address}
                        target="_blank"
                        className="text-sm text-green-500 flex items-center"
                      >
                        <FaExternalLinkAlt className="h-3 w-3 mr-1" />
                        Explorer
                      </Link>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FaChartLine className="text-primary" />
                        Total Value Locked (TVL)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold">$115,725</p>
                      <p className="text-sm text-muted-foreground">
                        Across all markets
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FaExchangeAlt className="text-primary" />
                        Active Markets
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold">{allMarkets.length}</p>
                      <p className="text-sm text-muted-foreground">
                        {allMarkets.length * 2} market events
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    <strong>Understanding Markets:</strong> By using{" "}
                    {ASSET_SYMBOL} as collateral, users can protect against
                    wildfire risks to mitigate or eliminate potential
                    losses. Hedge positions provide protection if a wildfire occurs,
                    while risk positions provide returns if no wildfire event happens.
                    Participants on the hedge side receive payouts when fires are detected,
                    while risk side participants earn returns when the coverage period ends without fire detection.
                  </p>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Select Market Strategy</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Tabs
                      defaultValue="hedge"
                      value={marketStrategy}
                      onValueChange={(value) => {
                        setMarketStrategy(value as "hedge" | "risk");
                        setSelectedContract("");
                        setTotalAssets("");
                      }}
                      className="w-full"
                    >
                      <TabsList className="grid grid-cols-2 w-full mb-6">
                        <TabsTrigger value="hedge">Hedge Side</TabsTrigger>
                        <TabsTrigger value="risk">Risk Side</TabsTrigger>
                      </TabsList>

                      <div className="bg-secondary/50 rounded-lg p-6 mb-6">
                        <div className="grid md:grid-cols-2 gap-8">
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm text-muted-foreground">
                                  Selected Side
                                </p>
                                <p
                                  className={`font-medium ${
                                    marketStrategy === "hedge"
                                      ? "text-blue-500"
                                      : "text-orange-500"
                                  }`}
                                >
                                  {marketStrategy === "hedge"
                                    ? "Hedge"
                                    : "Risk"}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">
                                  Underlying Asset
                                </p>
                                <p className="font-medium">{ASSET_SYMBOL}</p>
                              </div>
                            </div>

                            <div>
                              <p className="text-sm text-muted-foreground">
                                Asset Balance
                              </p>
                              <p className="font-medium">
                                {assetBalance} {ASSET_SYMBOL}
                              </p>
                            </div>

                            <div>
                              <p className="text-sm text-muted-foreground">
                                Market Event
                              </p>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">
                                  {eventDescription}
                                </p>
                                <a
                                  href="https://coston2-explorer.flare.network/"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline inline-flex items-center"
                                >
                                  <FaExternalLinkAlt className="h-3 w-3 ml-1" />
                                </a>
                              </div>
                            </div>

                            <div>
                              <p className="text-sm text-muted-foreground">
                                Market Id
                              </p>
                              <p className="font-medium">{marketId}</p>
                            </div>

                            <div>
                              <p className="text-sm text-muted-foreground">
                                Oracle
                              </p>
                              <p className="font-medium">{oracle}</p>
                            </div>

                            <div>
                              <p className="text-sm text-muted-foreground">
                                Fee
                              </p>
                              <p className="font-medium">0%</p>
                            </div>

                            <div>
                              <p className="text-sm text-muted-foreground">
                                Total Assets in Vault
                              </p>
                              <p className="font-medium">
                                {totalAssets} {ASSET_SYMBOL}
                              </p>
                            </div>

                            <div>
                              <p className="text-sm text-muted-foreground">
                                Potential Strike-Met Payout
                              </p>
                              <p className="font-medium text-green-500">
                                Initial + {payout}
                              </p>
                            </div>

                            {vaultAddress && (
                              <div className="flex items-center gap-1 text-sm">
                                <span className="text-muted-foreground">
                                  Vault:
                                </span>
                                <a
                                  href={`https://coston2-explorer.flare.network/address/${vaultAddress}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-primary hover:underline"
                                >
                                  {vaultAddress.substring(0, 6)}
                                  ...
                                  {vaultAddress.substring(
                                    vaultAddress.length - 4
                                  )}
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                            )}

                            {factoryAddress && (
                              <div className="flex items-center gap-1 text-sm">
                                <span className="text-muted-foreground">
                                  Factory:
                                </span>
                                <a
                                  href={`https://coston2-explorer.flare.network/address/${factoryAddress}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-primary hover:underline"
                                >
                                  {factoryAddress.substring(0, 6)}
                                  ...
                                  {factoryAddress.substring(
                                    factoryAddress.length - 4
                                  )}
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                            )}

                            {controllerAddress && (
                              <div className="flex items-center gap-1 text-sm">
                                <span className="text-muted-foreground">
                                  Controller:
                                </span>
                                <a
                                  href={`https://coston2-explorer.flare.network/address/${controllerAddress}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-primary hover:underline"
                                >
                                  {controllerAddress.substring(0, 6)}
                                  ...
                                  {controllerAddress.substring(
                                    controllerAddress.length - 4
                                  )}
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                            )}
                          </div>

                          <div className="space-y-4">
                            <div>
                              <label className="text-sm text-muted-foreground block mb-2">
                                Maturity Date & Strike Price
                              </label>
                              <Select
                                value={selectedContract}
                                onValueChange={setSelectedContract}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent className="bg-secondary">
                                  {allMarkets.map((option, index) => (
                                    <SelectItem
                                      key={index}
                                      value={
                                        marketStrategy === "hedge"
                                          ? option.HedgeAddress
                                          : option.RiskAddress
                                      }
                                    >
                                      {option.MaturityDate} ≡ $
                                      {option.StrikePrice}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <label className="text-sm text-muted-foreground block mb-2">
                                Enter Amount
                              </label>
                              <div className="relative">
                                <Input
                                  type="number"
                                  placeholder="Enter USDC amount"
                                  value={amount ? amount.toString() : ""}
                                  onChange={(e) =>
                                    setAmount(Number(e.target.value))
                                  }
                                  min="0"
                                  step="0.01"
                                  className="pr-24"
                                />
                                <div className="absolute right-1 top-1 flex space-x-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePercentageClick(25)}
                                    className="h-8 px-2 text-xs"
                                  >
                                    25%
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePercentageClick(50)}
                                    className="h-8 px-2 text-xs"
                                  >
                                    50%
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePercentageClick(100)}
                                    className="h-8 px-2 text-xs"
                                  >
                                    100%
                                  </Button>
                                </div>
                              </div>
                            </div>

                            <Button
                              className="w-full mt-2"
                              onClick={handleDeposit}
                              disabled={!selectedContract || !amount || loading}
                            >
                              {loading ? "Depositing..." : "Deposit"}
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="text-sm text-muted-foreground">
                        <p>
                          By depositing into this market, you are{" "}
                          {marketStrategy === "hedge"
                            ? "hedging against"
                            : "taking the risk that"}{" "}
                          fire detection in the specified area before
                          maturity.
                          {marketStrategy === "hedge"
                            ? " This protects your assets if the market event occurs."
                            : " You will earn premium if the market event does not occur."}
                        </p>
                      </div>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>

              <DashboardFooter />
            </main>
          </div>
        </SidebarProvider>
      )}
    </div>
  );
};

export default Markets;

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardFooter } from "@/components/DashboardFooter";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import ReactConfetti from "react-confetti";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink } from "lucide-react";
import { useAppKitAccount } from "@reown/appkit/react";
import { DashboardNavigation } from "@/components/DashboardNavigation";
import { useReadContract, useWriteContract } from "wagmi";
import { balanceErc20ABI, controllerABI, vaultABI } from "@/contract/abi";
import { allMarkets } from "@/contract/markets";
import {
  Address,
  createPublicClient,
  formatUnits,
  http,
  parseUnits,
} from "viem";
import { ASSET_DECIMALS, ASSET_SYMBOL } from "@/contract/asset";
import { waitForTransactionReceipt } from "viem/actions";
import { customNetwork } from "@/contract/chain";

type Market = {
  asset: string;
  maturityDate: string;
  strikePrice: number;
  event: string;
  contractAddress: string;
  factoryAddress: string;
  controllerAddress: string;
  totalShares: string;
  myShares: string;
  status: string;
  marketId: number;
};

const Portfolio = () => {
  const { isConnected, address } = useAppKitAccount();
  const [confetti, setConfetti] = useState(false);
  const { toast } = useToast();
  const [hedgeFilter, setHedgeFilter] = useState<"all" | "active" | "closed">(
    "all"
  );
  const [riskFilter, setRiskFilter] = useState<"all" | "active" | "closed">(
    "all"
  );
  const [withdrawAmounts, setWithdrawAmounts] = useState<
    Record<string, string>
  >({});
  const [withdrawTrigger, setWithdrawTrigger] = useState<boolean>(false);

  const handleWithdrawPercentageClick = (
    positionId: string,
    percentage: number,
    position: any
  ) => {
    const calculatedAmount = (
      (position.myShares * percentage) /
      100
    ).toString();
    setWithdrawAmounts({
      ...withdrawAmounts,
      [positionId]: calculatedAmount,
    });
  };

  const handleWithdrawAmountChange = (positionId: string, value: string) => {
    setWithdrawAmounts({
      ...withdrawAmounts,
      [positionId]: value,
    });
  };
  const [hedgeMarkets, setHedgeMarkets] = useState<Market[]>([]);
  const [riskMarkets, setRiskMarkets] = useState<Market[]>([]);

  const [loading, setLoading] = useState<boolean>(false);

  const { writeContractAsync } = useWriteContract();

  const client = createPublicClient({
    chain: customNetwork,
    transport: http(),
  });

  const withdrawTokens = async (
    vaultAddress: string,
    amount: number
  ): Promise<boolean> => {
    if (!amount) {
      console.log("Amount is not set");
      return false;
    }
    if (!isConnected || !address) {
      console.log("Address not connected");
      return false;
    }
    if (!vaultAddress) {
      console.log("Contract not set");
      return false;
    }
    setLoading(true);
    try {
      const value = parseUnits(amount.toString(), ASSET_DECIMALS);
      const txHash = await writeContractAsync({
        abi: vaultABI,
        address: vaultAddress as Address,
        functionName: "withdraw",
        args: [value, address, address],
      });
      const result = await waitForTransactionReceipt(client, {
        confirmations: 1,
        hash: txHash,
      });
      console.log("withdraw done", result);
      return true;
    } catch (error) {
      console.log("Error.", error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (positionId: string) => {
    const result = await withdrawTokens(
      positionId,
      Number(withdrawAmounts[positionId])
    );
    if (result) {
      setWithdrawAmounts({
        ...withdrawAmounts,
        [positionId]: "",
      });
      toast({
        title: "Withdrawal successful",
        description: `You've withdrawn ${withdrawAmounts[positionId]} assets from vault #${positionId}.`,
      });
      setConfetti(true);
    } else {
      toast({
        title: "Failed",
        variant: "destructive",
        description: `Please check the console or contact developers.`,
      });
    }
    setWithdrawTrigger(!withdrawTrigger);
  };

  const filteredHedgePositions = hedgeMarkets.filter((pos) => {
    if (hedgeFilter === "all") return true;
    if (hedgeFilter === "active" && pos.status === "Open") return true;
    if (hedgeFilter === "closed" && pos.status !== "Open") return true;
    return false;
  });

  const filteredRiskPositions = riskMarkets.filter((pos) => {
    if (riskFilter === "all") return true;
    if (riskFilter === "active" && pos.status === "Open") return true;
    if (riskFilter === "closed" && pos.status !== "Open") return true;
    return false;
  });

  useEffect(() => {
    if (confetti) {
      const timer = setTimeout(() => {
        setConfetti(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [confetti]);

  const hedgeBalances = allMarkets.map((market, _) => {
    return useReadContract({
      abi: balanceErc20ABI,
      address: market.HedgeAddress as Address,
      functionName: "balanceOf",
      args: [address],
    });
  });

  const hedgeTotal = allMarkets.map((market, _) => {
    return useReadContract({
      abi: vaultABI,
      address: market.HedgeAddress as Address,
      functionName: "totalSupply",
      args: [],
    });
  });

  const riskBalances = allMarkets.map((market, _) => {
    return useReadContract({
      abi: balanceErc20ABI,
      address: market.RiskAddress as Address,
      functionName: "balanceOf",
      args: [address],
    });
  });

  const riskTotal = allMarkets.map((market, _) => {
    return useReadContract({
      abi: vaultABI,
      address: market.RiskAddress as Address,
      functionName: "totalSupply",
      args: [],
    });
  });

  const marketStatus = allMarkets.map((market, index) => {
    return useReadContract({
      abi: controllerABI,
      address: market.ControllerAddress as Address,
      functionName: "getMarketState",
      args: [index + 1],
    });
  });

  const getStatusString = (status: number) => {
    switch (status) {
      case 0:
        return "NotSet";
      case 1:
        return "Open";
      case 2:
        return "Locked";
      case 3:
        return "Matured";
      case 4:
        return "Liquidated";
      default:
        return "Unknown";
    }
  };

  useEffect(() => {
    if (!isConnected) return;
    if (hedgeBalances) {
      (async () => {
        try {
          const positions: Market[] = [];
          for (let i = 0; i < hedgeBalances.length; i++) {
            const market = allMarkets[i];
            const result = await hedgeBalances[i].refetch();
            console.log("Hedge position fetch result:", result);
            if (result.isSuccess && result.data !== BigInt(0)) {
              const totalSharesResult = await hedgeTotal[i].refetch();
              console.log("Hedge position total shares:", totalSharesResult);
              const stateOfMarket = await marketStatus[i].refetch();
              console.log("Status:", stateOfMarket);
              const hedgePosition: Market = {
                asset: ASSET_SYMBOL,
                maturityDate: market.MaturityDate,
                strikePrice: market.StrikePrice,
                event: market.HedgeEvent,
                contractAddress: market.HedgeAddress,
                factoryAddress: market.FactoryAddress,
                controllerAddress: market.ControllerAddress,
                totalShares: totalSharesResult.data
                  ? formatUnits(
                      totalSharesResult.data as bigint,
                      ASSET_DECIMALS
                    )
                  : "",
                myShares: formatUnits(result.data as bigint, ASSET_DECIMALS),
                status: stateOfMarket.data
                  ? getStatusString(stateOfMarket.data as number)
                  : "",
                marketId: market.MarketId,
              };
              console.log("Adding hedge position");
              positions.push(hedgePosition);
            }
          }
          setHedgeMarkets(positions);
        } catch (error) {
          console.error("Error refetching hedge position:", error);
          setHedgeMarkets([]);
        }
      })();
    }
  }, [address, isConnected, withdrawTrigger]);

  useEffect(() => {
    if (!isConnected) return;
    if (riskBalances) {
      (async () => {
        try {
          const positions: Market[] = [];
          for (let i = 0; i < riskBalances.length; i++) {
            const market = allMarkets[i];
            const result = await riskBalances[i].refetch();
            console.log("Risk position fetch result:", result);
            if (result.isSuccess && result.data !== BigInt(0)) {
              const totalSharesResult = await riskTotal[i].refetch();
              console.log("Risk position total shares:", totalSharesResult);
              const stateOfMarket = await marketStatus[i].refetch();
              console.log("Status:", stateOfMarket);
              const riskPosition: Market = {
                asset: ASSET_SYMBOL,
                maturityDate: market.MaturityDate,
                strikePrice: market.StrikePrice,
                event: market.RiskEvent,
                contractAddress: market.RiskAddress,
                factoryAddress: market.FactoryAddress,
                controllerAddress: market.ControllerAddress,
                totalShares: totalSharesResult.data
                  ? formatUnits(
                      totalSharesResult.data as bigint,
                      ASSET_DECIMALS
                    )
                  : "",
                myShares: formatUnits(result.data as bigint, ASSET_DECIMALS),
                status: stateOfMarket.data
                  ? getStatusString(stateOfMarket.data as number)
                  : "",
                marketId: market.MarketId,
              };
              console.log("Adding risk position");
              positions.push(riskPosition);
            }
          }
          setRiskMarkets(positions);
        } catch (error) {
          console.error("Error refetching risk position:", error);
          setRiskMarkets([]);
        }
      })();
    }
  }, [address, isConnected, withdrawTrigger]);

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
                <Card>
                  <CardHeader>
                    <CardTitle className="text-2xl">
                      Explore Your Market Positions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="hedge" className="w-full">
                      <TabsList className="grid grid-cols-2 w-full mb-6">
                        <TabsTrigger
                          value="hedge"
                          className="flex items-center gap-2"
                        >
                          Hedge Positions
                        </TabsTrigger>
                        <TabsTrigger
                          value="risk"
                          className="flex items-center gap-2"
                        >
                          Risk Positions
                        </TabsTrigger>
                      </TabsList>

                      {/* Hedge Tab Content */}
                      <TabsContent value="hedge" className="mt-0 space-y-6">
                        <Tabs
                          defaultValue="all"
                          value={hedgeFilter}
                          onValueChange={(v) => setHedgeFilter(v as any)}
                        >
                          <TabsList className="w-full">
                            <TabsTrigger value="all">All</TabsTrigger>
                            <TabsTrigger value="active">Active</TabsTrigger>
                            <TabsTrigger value="closed">Inactive</TabsTrigger>
                          </TabsList>

                          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {filteredHedgePositions.length === 0 ? (
                              <p className="col-span-full text-center py-12 text-muted-foreground">
                                No positions found
                              </p>
                            ) : (
                              filteredHedgePositions.map((position) => (
                                <Card
                                  key={position.contractAddress}
                                  className="overflow-hidden"
                                >
                                  <CardContent className="p-6 space-y-4">
                                    <div className="font-medium text-lg text-blue-500 flex items-center gap-2">
                                      {position.asset}
                                      <span
                                        className={`text-xs px-2 py-1 rounded-full ${
                                          position.status === "Open"
                                            ? "bg-green-100 text-green-800"
                                            : "bg-gray-100 text-gray-800"
                                        }`}
                                      >
                                        {position.status
                                          .charAt(0)
                                          .toUpperCase() +
                                          position.status.slice(1)}
                                      </span>
                                    </div>

                                    <div className="space-y-3">
                                      <div className="flex flex-col">
                                        <span className="text-muted-foreground">
                                          Maturity & Strike:
                                        </span>
                                        <span className="font-medium">
                                          {position.maturityDate} ≡ $
                                          {position.strikePrice}
                                        </span>
                                      </div>

                                      <div className="text-sm">
                                        <p className="text-muted-foreground mb-1">
                                          Market Event:
                                        </p>
                                        <p>{position.event}</p>
                                      </div>

                                      <div className="text-sm">
                                        <p className="text-muted-foreground mb-1">
                                          Market ID:
                                        </p>
                                        <p className="font-medium">
                                          {position.marketId}
                                        </p>
                                      </div>

                                      <div className="flex items-center gap-1 text-sm">
                                        <span className="text-muted-foreground">
                                          Vault:
                                        </span>
                                        <a
                                          href={`https://coston2-explorer.flare.network/address/${position.contractAddress}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center gap-1 text-primary hover:underline"
                                        >
                                          {position.contractAddress.substring(
                                            0,
                                            6
                                          )}
                                          ...
                                          {position.contractAddress.substring(
                                            position.contractAddress.length - 4
                                          )}
                                          <ExternalLink className="h-3 w-3" />
                                        </a>
                                      </div>

                                      <div className="flex items-center gap-1 text-sm">
                                        <span className="text-muted-foreground">
                                          Factory:
                                        </span>
                                        <a
                                          href={`https://coston2-explorer.flare.network/address/${position.factoryAddress}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center gap-1 text-primary hover:underline"
                                        >
                                          {position.factoryAddress.substring(
                                            0,
                                            6
                                          )}
                                          ...
                                          {position.factoryAddress.substring(
                                            position.factoryAddress.length - 4
                                          )}
                                          <ExternalLink className="h-3 w-3" />
                                        </a>
                                      </div>

                                      <div className="flex items-center gap-1 text-sm">
                                        <span className="text-muted-foreground">
                                          Controller:
                                        </span>
                                        <a
                                          href={`https://coston2-explorer.flare.network/address/${position.controllerAddress}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center gap-1 text-primary hover:underline"
                                        >
                                          {position.controllerAddress.substring(
                                            0,
                                            6
                                          )}
                                          ...
                                          {position.controllerAddress.substring(
                                            position.controllerAddress.length -
                                              4
                                          )}
                                          <ExternalLink className="h-3 w-3" />
                                        </a>
                                      </div>

                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <p className="text-muted-foreground text-sm">
                                            Total Shares:
                                          </p>
                                          <p className="font-medium">
                                            {position.totalShares}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-muted-foreground text-sm">
                                            My Shares:
                                          </p>
                                          <p className="font-medium">
                                            {position.myShares}
                                          </p>
                                        </div>
                                      </div>
                                    </div>

                                    {position.status && (
                                      <div className="pt-4 border-t border-border">
                                        <div className="mb-3">
                                          <div className="relative">
                                            <Input
                                              type="number"
                                              placeholder="Amount to withdraw"
                                              className="pr-24"
                                              value={
                                                withdrawAmounts[
                                                  position.contractAddress
                                                ] || ""
                                              }
                                              onChange={(e) =>
                                                handleWithdrawAmountChange(
                                                  position.contractAddress,
                                                  e.target.value
                                                )
                                              }
                                              min="0"
                                              max={position.myShares.toString()}
                                              step="0.01"
                                            />
                                            <div className="absolute right-1 top-1 flex space-x-1">
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                  handleWithdrawPercentageClick(
                                                    position.contractAddress,
                                                    25,
                                                    position
                                                  )
                                                }
                                                className="h-8 px-2 text-xs"
                                              >
                                                25%
                                              </Button>
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                  handleWithdrawPercentageClick(
                                                    position.contractAddress,
                                                    50,
                                                    position
                                                  )
                                                }
                                                className="h-8 px-2 text-xs"
                                              >
                                                50%
                                              </Button>
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                  handleWithdrawPercentageClick(
                                                    position.contractAddress,
                                                    100,
                                                    position
                                                  )
                                                }
                                                className="h-8 px-2 text-xs"
                                              >
                                                100%
                                              </Button>
                                            </div>
                                          </div>
                                        </div>
                                        <Button
                                          className="w-full"
                                          variant="default"
                                          disabled={
                                            !withdrawAmounts[
                                              position.contractAddress
                                            ] || loading
                                          }
                                          onClick={() =>
                                            handleWithdraw(
                                              position.contractAddress
                                            )
                                          }
                                        >
                                          {loading
                                            ? "Withdrawing..."
                                            : "Withdraw"}
                                        </Button>
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                              ))
                            )}
                          </div>
                        </Tabs>
                      </TabsContent>

                      {/* Risk Tab Content */}
                      <TabsContent value="risk" className="mt-0 space-y-6">
                        <Tabs
                          defaultValue="all"
                          value={riskFilter}
                          onValueChange={(v) => setRiskFilter(v as any)}
                        >
                          <TabsList className="w-full">
                            <TabsTrigger value="all">All</TabsTrigger>
                            <TabsTrigger value="active">Active</TabsTrigger>
                            <TabsTrigger value="closed">Inactive</TabsTrigger>
                          </TabsList>

                          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {filteredRiskPositions.length === 0 ? (
                              <p className="col-span-full text-center py-12 text-muted-foreground">
                                No positions found
                              </p>
                            ) : (
                              filteredRiskPositions.map((position) => (
                                <Card
                                  key={position.contractAddress}
                                  className="overflow-hidden"
                                >
                                  <CardContent className="p-6 space-y-4">
                                    <div className="font-medium text-lg text-orange-500 flex items-center gap-2">
                                      {position.asset}
                                      <span
                                        className={`text-xs px-2 py-1 rounded-full ${
                                          position.status === "Open"
                                            ? "bg-green-100 text-green-800"
                                            : "bg-gray-100 text-gray-800"
                                        }`}
                                      >
                                        {position.status
                                          .charAt(0)
                                          .toUpperCase() +
                                          position.status.slice(1)}
                                      </span>
                                    </div>

                                    <div className="space-y-3">
                                      <div className="flex flex-col">
                                        <span className="text-muted-foreground">
                                          Maturity & Strike:
                                        </span>
                                        <span className="font-medium">
                                          {position.maturityDate} ≡ $
                                          {position.strikePrice}
                                        </span>
                                      </div>

                                      <div className="text-sm">
                                        <p className="text-muted-foreground mb-1">
                                          Market Event:
                                        </p>
                                        <p>{position.event}</p>
                                      </div>

                                      <div className="text-sm">
                                        <p className="text-muted-foreground mb-1">
                                          Market ID:
                                        </p>
                                        <p className="font-medium">
                                          {position.marketId}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-1 text-sm">
                                        <span className="text-muted-foreground">
                                          Vault:
                                        </span>
                                        <a
                                          href={`https://coston2-explorer.flare.network/address/${position.contractAddress}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center gap-1 text-primary hover:underline"
                                        >
                                          {position.contractAddress.substring(
                                            0,
                                            6
                                          )}
                                          ...
                                          {position.contractAddress.substring(
                                            position.contractAddress.length - 4
                                          )}
                                          <ExternalLink className="h-3 w-3" />
                                        </a>
                                      </div>

                                      <div className="flex items-center gap-1 text-sm">
                                        <span className="text-muted-foreground">
                                          Factory:
                                        </span>
                                        <a
                                          href={`https://coston2-explorer.flare.network/address/${position.factoryAddress}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center gap-1 text-primary hover:underline"
                                        >
                                          {position.factoryAddress.substring(
                                            0,
                                            6
                                          )}
                                          ...
                                          {position.factoryAddress.substring(
                                            position.factoryAddress.length - 4
                                          )}
                                          <ExternalLink className="h-3 w-3" />
                                        </a>
                                      </div>

                                      <div className="flex items-center gap-1 text-sm">
                                        <span className="text-muted-foreground">
                                          Controller:
                                        </span>
                                        <a
                                          href={`https://coston2-explorer.flare.network/address/${position.controllerAddress}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center gap-1 text-primary hover:underline"
                                        >
                                          {position.controllerAddress.substring(
                                            0,
                                            6
                                          )}
                                          ...
                                          {position.controllerAddress.substring(
                                            position.controllerAddress.length -
                                              4
                                          )}
                                          <ExternalLink className="h-3 w-3" />
                                        </a>
                                      </div>

                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <p className="text-muted-foreground text-sm">
                                            Total Shares:
                                          </p>
                                          <p className="font-medium">
                                            {position.totalShares}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-muted-foreground text-sm">
                                            My Shares:
                                          </p>
                                          <p className="font-medium">
                                            {position.myShares}
                                          </p>
                                        </div>
                                      </div>
                                    </div>

                                    {position.status && (
                                      <div className="pt-4 border-t border-border">
                                        <div className="mb-3">
                                          <div className="relative">
                                            <Input
                                              type="number"
                                              placeholder="Amount to withdraw"
                                              className="pr-24"
                                              value={
                                                withdrawAmounts[
                                                  position.contractAddress
                                                ] || ""
                                              }
                                              onChange={(e) =>
                                                handleWithdrawAmountChange(
                                                  position.contractAddress,
                                                  e.target.value
                                                )
                                              }
                                              min="0"
                                              max={position.myShares.toString()}
                                              step="0.01"
                                            />
                                            <div className="absolute right-1 top-1 flex space-x-1">
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                  handleWithdrawPercentageClick(
                                                    position.contractAddress,
                                                    25,
                                                    position
                                                  )
                                                }
                                                className="h-8 px-2 text-xs"
                                              >
                                                25%
                                              </Button>
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                  handleWithdrawPercentageClick(
                                                    position.contractAddress,
                                                    50,
                                                    position
                                                  )
                                                }
                                                className="h-8 px-2 text-xs"
                                              >
                                                50%
                                              </Button>
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                  handleWithdrawPercentageClick(
                                                    position.contractAddress,
                                                    100,
                                                    position
                                                  )
                                                }
                                                className="h-8 px-2 text-xs"
                                              >
                                                100%
                                              </Button>
                                            </div>
                                          </div>
                                        </div>
                                        <Button
                                          className="w-full"
                                          variant="default"
                                          disabled={
                                            !withdrawAmounts[
                                              position.contractAddress
                                            ] || loading
                                          }
                                          onClick={() =>
                                            handleWithdraw(
                                              position.contractAddress
                                            )
                                          }
                                        >
                                          {loading
                                            ? "Withdrawing..."
                                            : "Withdraw"}
                                        </Button>
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                              ))
                            )}
                          </div>
                        </Tabs>
                      </TabsContent>
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

export default Portfolio;

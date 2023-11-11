import _ from "lodash";
import { useEffect, useMemo, useState } from "react";
import {
  getConfiguration,
  saveConfiguration,
} from "../middlelayers/configuration";
import { toast } from "react-hot-toast";
import DeleteIcon from "@/assets/icons/delete-icon.png";
import BinanceLogo from "@/assets/icons/binance-logo.svg";
import OkexLogo from "@/assets/icons/okex-logo.svg";
import BTCLogo from "@/assets/icons/btc-logo.svg";
import ETHLogo from "@/assets/icons/eth-logo.svg";
import SOLLogo from "@/assets/icons/sol-logo.svg";
import DOGELogo from "@/assets/icons/doge-logo.svg";
import { GlobalConfig, TokenConfig } from "../middlelayers/datafetch/types";
import { CurrencyRateDetail } from "../middlelayers/types";
import { listAllCurrencyRates } from "../middlelayers/currency";
import { Separator } from "./ui/separator";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

const initialConfiguration: GlobalConfig = {
  configs: {
    groupUSD: true,
    querySize: 10,
    preferCurrency: "USD",
  },
  exchanges: [],
  erc20: {
    addresses: [],
  },
  btc: {
    addresses: [],
  },
  sol: {
    addresses: [],
  },
  doge: {
    addresses: [],
  },
  others: [],
};

const defaultExChangeConfig = {
  type: "binance",
  apiKey: "",
  secret: "",
};

const defaultWalletConfig = {
  type: "btc",
  address: "",
};

const defaultOtherConfig = {
  symbol: "",
  amount: 0,
};

const supportCoins = ["btc", "erc20", "sol", "doge"];

const cexOptions = [
  {
    value: "binance",
    label: "Binance",
  },
  {
    value: "okex",
    label: "OKex",
  },
];

const walletOptions = [
  {
    value: "btc",
    label: "BTC",
  },
  {
    value: "erc20",
    label: "ERC20",
  },
  {
    value: "sol",
    label: "SOL",
  },
  {
    value: "doge",
    label: "DOGE",
  },
];

const querySizeOptions = [
  {
    value: "10",
    label: "10",
  },
  {
    value: "20",
    label: "20",
  },
  {
    value: "50",
    label: "50",
  },
];

const Configuration = ({
  onConfigurationSave,
}: {
  onConfigurationSave?: () => void;
}) => {
  const [groupUSD, setGroupUSD] = useState(true);
  const [querySize, setQuerySize] = useState(0);
  const [formChanged, setFormChanged] = useState(false);
  const [preferCurrency, setPreferCurrency] = useState("USD");
  const [addExchangeDialogOpen, setAddExchangeDialogOpen] = useState(false);
  const [addWalletDialogOpen, setAddWalletDialogOpen] = useState(false);
  const [addOtherDialogOpen, setAddOtherDialogOpen] = useState(false);

  const [addExchangeConfig, setAddExchangeConfig] = useState<
    | {
        type: string;
        apiKey: string;
        secret: string;
        password?: string;
        alias?: string;
      }
    | undefined
  >(undefined);
  const [addWalletConfig, setAddWalletConfig] = useState<
    | {
        type: string;
        address: string;
        alias?: string;
      }
    | undefined
  >(undefined);
  const [addOtherConfig, setAddOtherConfig] = useState<
    | {
        symbol: string;
        amount: number;
      }
    | undefined
  >(undefined);

  const [currencies, setCurrencies] = useState<CurrencyRateDetail[]>([]);

  const [wallets, setWallets] = useState<
    {
      type: string;
      alias?: string;
      address: string;
    }[]
  >([]);

  const [exchanges, setExchanges] = useState<
    {
      alias?: string;
      type: string;
      apiKey: string;
      secret: string;
      password?: string;
    }[]
  >([]);

  const [others, setOthers] = useState<
    {
      symbol: string;
      amount: number;
    }[]
  >([]);

  const preferCurrencyOptions = useMemo(
    () =>
      _(currencies)
        .map((c) => ({
          value: c.currency,
          label: `${c.currency} - ${c.alias}`,
        }))
        .value(),
    [currencies]
  );

  useEffect(() => {
    loadConfiguration();
    loadSupportedCurrencies();
  }, []);

  async function loadSupportedCurrencies() {
    const currencies = await listAllCurrencyRates();
    setCurrencies(currencies);
  }

  function loadConfiguration() {
    getConfiguration()
      .then((d) => {
        const globalConfig = d ?? initialConfiguration;

        setGroupUSD(globalConfig.configs.groupUSD);
        setQuerySize(globalConfig.configs.querySize || 10);
        setPreferCurrency(globalConfig.configs.preferCurrency || "USD");

        setExchanges(
          _(globalConfig.exchanges)
            .map((ex) => ({
              type: ex.name,
              alias: ex.alias,
              apiKey: ex.initParams.apiKey,
              secret: ex.initParams.secret,
              password: ex.initParams.password,
            }))
            .value()
        );

        setWallets(
          _(globalConfig)
            .pick(supportCoins)
            .map((v: any, k: string) =>
              _(v.addresses)
                .map((a) => {
                  if (_(a).isString()) {
                    return { type: k, address: a };
                  }
                  const na = a as { address: string; alias?: string };
                  return {
                    type: k,
                    address: na.address,
                    alias: na.alias,
                  };
                })
                .value()
            )
            .flatten()
            .value()
        );

        setOthers(globalConfig.others);
      })
      .catch((e) => {
        toast.error("get configuration failed:", e);
      });
  }

  function onGroupUSDSelectChange(v: boolean) {
    setGroupUSD(!!v);

    // mark form is changed
    markFormChanged();
  }

  function markFormChanged() {
    setFormChanged(true);
  }

  function submitConfiguration() {
    const globalConfig = convertFormDataToConfigurationData();
    let saveError: Error | undefined;

    saveConfiguration(globalConfig)
      .then(() => onConfigurationSave && onConfigurationSave())
      .catch((e) => (saveError = e))
      .finally(() => {
        if (saveError) {
          toast.error(saveError.message ?? saveError);
        }
      });
  }

  function convertFormDataToConfigurationData(): GlobalConfig {
    const exchangesData = _(exchanges)
      .map((ex) => ({
        name: ex.type,
        alias: ex.alias,
        initParams: {
          apiKey: ex.apiKey,
          secret: ex.secret,
          password: ex.type !== "okex" ? undefined : ex.password,
        },
      }))
      .value();

    const walletData = _(wallets)
      .groupBy("type")
      .mapValues((ws) => ({
        addresses: _(ws)
          .map((w) => ({
            alias: w.alias,
            address: w.address,
          }))
          .value(),
      }))
      .value() as any as TokenConfig;

    return {
      configs: {
        groupUSD,
        querySize,
        preferCurrency,
      },
      exchanges: exchangesData,
      // expand wallet
      ..._(supportCoins)
        .mapKeys((c) => c)
        .mapValues(() => ({ addresses: [] }))
        .value(),
      ...walletData,
      others,
    };
  }

  function renderExchangeForm(
    exs: {
      type: string;
      alias?: string;
      apiKey: string;
      secret: string;
      password?: string;
    }[]
  ) {
    const renderExchangeItems = () => {
      return _(exs)
        .map((ex, idx) => (
          <Card
            key={ex.apiKey + idx}
            className="cursor-pointer hover:shadow-lg group"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4">
              <CardTitle className="text-sm font-medium">{ex.type}</CardTitle>
              <div className="flex ">
                <img
                  src={DeleteIcon}
                  className="h-4 w-4 text-muted-foreground hidden group-hover:inline-block mr-2"
                  onClick={() => handleRemoveExchange(idx)}
                />
                {/* binance */}
                {ex.type === "binance" && (
                  <img
                    className="h-4 w-4 text-muted-foreground"
                    src={BinanceLogo}
                  ></img>
                )}
                {/* okex */}
                {ex.type === "okex" && (
                  <img
                    className="h-4 w-4 text-muted-foreground"
                    src={OkexLogo}
                  />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">
                {ex.alias ?? ex.type + idx}
              </div>
              <p className="text-xs text-muted-foreground overflow-ellipsis overflow-hidden">
                <span>{ex.apiKey}</span>
              </p>
            </CardContent>
          </Card>
        ))
        .value();
    };
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
        {renderExchangeItems()}
      </div>
    );
  }

  function handleWalletChange(idx: number, key: string, val: string) {
    const newWs = _.set(wallets, [idx, key], val);
    setWallets([...newWs]);

    // mark form is changed
    markFormChanged();
  }

  function renderWalletForm(
    ws: { type: string; alias?: string; address: string }[]
  ) {
    const renderWalletItems = () => {
      return _(ws)
        .map((w, idx) => {
          return (
            <Card
              key={w.address + idx}
              className="cursor-pointer hover:shadow-lg group"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4">
                <CardTitle className="text-sm font-medium">
                  {w.type.toUpperCase()}
                </CardTitle>
                <div className="flex ">
                  <img
                    src={DeleteIcon}
                    className="h-4 w-4 text-muted-foreground hidden group-hover:inline-block mr-2"
                    onClick={() => handleRemoveWallet(idx)}
                  />
                  {w.type === "btc" && (
                    <img
                      src={BTCLogo}
                      className="h-4 w-4 text-muted-foreground mr-2"
                    />
                  )}
                  {w.type === "erc20" && (
                    <img
                      src={ETHLogo}
                      className="h-4 w-4 text-muted-foreground mr-2"
                    />
                  )}
                  {w.type === "doge" && (
                    <img
                      src={DOGELogo}
                      className="h-4 w-4 text-muted-foreground mr-2"
                    />
                  )}
                  {w.type === "sol" && (
                    <img
                      src={SOLLogo}
                      className="h-4 w-4 text-muted-foreground mr-2"
                    />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">
                  {w.alias ?? w.type + idx}
                </div>
                <p className="text-xs text-muted-foreground overflow-ellipsis overflow-hidden">
                  <span>{w.address}</span>
                </p>
              </CardContent>
            </Card>
          );
        })
        .value();
    };
    return (
      <div className="grid gap-4 sm:grid-cols-1 xl:grid-cols-1">
        {renderWalletItems()}
      </div>
    );
  }

  // save to db, when these values change
  useEffect(() => {
    if (formChanged) {
      submitConfiguration();
    }
  }, [
    formChanged,
    groupUSD,
    querySize,
    preferCurrency,
    exchanges,
    wallets,
    others,
  ]);

  function handleOthersChange(idx: number, key: string, val: string) {
    const nos = _.set(others, [idx, key], val);
    setOthers([...nos]);
    // mark form is changed
    markFormChanged();
  }

  function onQuerySizeChanged(val: string) {
    setQuerySize(parseInt(val, 10));

    // mark form is changed
    markFormChanged();
  }

  function onPreferCurrencyChanged(val: string) {
    setPreferCurrency(val);
    // mark form is changed
    markFormChanged();
  }

  function renderOthersForm(vals: { symbol: string; amount: number }[]) {
    return _(vals)
      .map((o, idx) => (
        <div key={"other" + idx} className="grid gap-4 grid-cols-3">
          <Input
            type="text"
            name="symbol"
            placeholder="symbol, e.g. BTC"
            value={o.symbol}
            className="w-15"
            onChange={(e) => handleOthersChange(idx, "symbol", e.target.value)}
          />
          <Input
            type="number"
            name="amount"
            placeholder="amount"
            value={o.amount}
            className="w-30"
            onChange={(e) => handleOthersChange(idx, "amount", e.target.value)}
          />
          <a onClick={() => handleRemoveOther(idx)}>
            <img src={DeleteIcon} alt="delete" className="w-4 h-4 mt-2" />
          </a>
        </div>
      ))
      .value();
  }

  function handleRemoveExchange(idx: number) {
    setExchanges(_.filter(exchanges, (_, i) => i !== idx));

    // mark form is changed
    markFormChanged();
  }

  function handleAddWallet(val: { type: string; address: string }) {
    setWallets([...wallets, val]);

    // mark form is changed
    markFormChanged();
  }

  function handleAddOther(val: { symbol: string; amount: number }) {
    setOthers([...others, val]);

    // mark form is changed
    markFormChanged();
  }

  function handleRemoveOther(idx: number) {
    setOthers(_.filter(others, (_, i) => i !== idx));

    // mark form is changed
    markFormChanged();
  }

  function handleRemoveWallet(idx: number) {
    setWallets(_.filter(wallets, (_, i) => i !== idx));

    // mark form is changed
    markFormChanged();
  }

  function handleExchangeChange(val: {
    type: string;
    apiKey: string;
    secret: string;
    password?: string;
    alias?: string;
  }) {
    setExchanges([...exchanges, val]);

    // mark form is changed
    markFormChanged();
  }

  // submit button clicked in add exchange form
  function onAddExchangeFormSubmit() {
    if (
      !addExchangeConfig ||
      !addExchangeConfig.type ||
      !addExchangeConfig.apiKey ||
      !addExchangeConfig.secret
    ) {
      toast.error("Exchange type, api key and secret is required");
      return;
    }

    if (addExchangeConfig.type === "okex" && !addExchangeConfig.password) {
      toast.error("Password is required for okex");
      return;
    }

    handleExchangeChange(addExchangeConfig);

    // clear
    setAddExchangeConfig(undefined);
    setAddExchangeDialogOpen(false);
  }

  function renderAddExchangeForm() {
    return (
      <Dialog
        open={addExchangeDialogOpen}
        onOpenChange={setAddExchangeDialogOpen}
      >
        <DialogTrigger asChild>
          <Button>Add</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Exchange Configuration</DialogTitle>
            <DialogDescription>
              Add exchange api key and secret here. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Type
              </Label>
              <Select
                onValueChange={(e) =>
                  setAddExchangeConfig({
                    ...(addExchangeConfig || defaultExChangeConfig),
                    type: e,
                  })
                }
                value={addExchangeConfig?.type ?? ""}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select CEX" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Cex</SelectLabel>
                    {cexOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="alias" className="text-right">
                Alias
              </Label>
              <Input
                id="alias"
                value={addExchangeConfig?.alias ?? ""}
                onChange={(e) =>
                  setAddExchangeConfig({
                    ...(addExchangeConfig || defaultExChangeConfig),
                    alias: e.target.value,
                  })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="apiKey" className="text-right">
                Api Key
              </Label>
              <Input
                id="apiKey"
                value={addExchangeConfig?.apiKey ?? ""}
                onChange={(e) =>
                  setAddExchangeConfig({
                    ...(addExchangeConfig || defaultExChangeConfig),
                    apiKey: e.target.value,
                  })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="apiSecret" className="text-right">
                Api Secret
              </Label>
              <Input
                id="apiSecret"
                value={addExchangeConfig?.secret ?? ""}
                type="password"
                onChange={(e) =>
                  setAddExchangeConfig({
                    ...(addExchangeConfig || defaultExChangeConfig),
                    secret: e.target.value,
                  })
                }
                className="col-span-3"
              />
            </div>
            {addExchangeConfig?.type === "okex" && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="password" className="text-right">
                  Password
                </Label>
                <Input
                  id="password"
                  value={addExchangeConfig?.password ?? ""}
                  type="password"
                  onChange={(e) =>
                    setAddExchangeConfig({
                      ...(addExchangeConfig || defaultExChangeConfig),
                      password: e.target.value,
                    })
                  }
                  className="col-span-3"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" onClick={onAddExchangeFormSubmit}>
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // submit button clicked in add wallet form
  function onAddWalletFormSubmit() {
    if (!addWalletConfig || !addWalletConfig.type || !addWalletConfig.address) {
      // alert
      toast.error("Wallet type and address is required");
      return;
    }
    handleAddWallet(addWalletConfig);

    // clear
    setAddWalletConfig(undefined);

    setAddWalletDialogOpen(false);
  }

  function renderAddWalletForm() {
    return (
      <Dialog open={addWalletDialogOpen} onOpenChange={setAddWalletDialogOpen}>
        <DialogTrigger asChild>
          <Button>Add</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Wallet Configuration</DialogTitle>
            <DialogDescription>
              Add wallet address here. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Type
              </Label>
              <Select
                onValueChange={(e) =>
                  setAddWalletConfig({
                    ...(addWalletConfig || defaultWalletConfig),
                    type: e,
                  })
                }
                value={addWalletConfig?.type ?? ""}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select Wallet" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Wallet Type</SelectLabel>
                    {walletOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="alias" className="text-right">
                Alias
              </Label>
              <Input
                id="alias"
                value={addWalletConfig?.alias ?? ""}
                onChange={(e) =>
                  setAddWalletConfig({
                    ...(addWalletConfig || defaultWalletConfig),
                    alias: e.target.value,
                  })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="address" className="text-right">
                Address
              </Label>
              <Input
                id="address"
                value={addWalletConfig?.address ?? ""}
                onChange={(e) =>
                  setAddWalletConfig({
                    ...(addWalletConfig || defaultWalletConfig),
                    address: e.target.value,
                  })
                }
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={onAddWalletFormSubmit}>
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // submit button clicked in add other form
  function onAddOtherFormSubmit() {
    if (!addOtherConfig || !addOtherConfig.symbol) {
      // alert
      toast.error("Symbol is required");
      return;
    }
    handleAddOther(addOtherConfig);
    // clear
    setAddOtherConfig(undefined);
    setAddOtherDialogOpen(false);
  }

  function renderAddOtherForm() {
    return (
      <Dialog open={addOtherDialogOpen} onOpenChange={setAddOtherDialogOpen}>
        <DialogTrigger asChild>
          <Button>Add</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Other Configuration</DialogTitle>
            <DialogDescription>
              Add extra symbol and amount here. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="symbol" className="text-right">
                Symbol
              </Label>
              <Input
                id="symbol"
                value={addOtherConfig?.symbol ?? ""}
                onChange={(e) =>
                  setAddOtherConfig({
                    ...(addOtherConfig || defaultOtherConfig),
                    symbol: e.target.value,
                  })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">
                Amount
              </Label>
              <Input
                id="amount"
                type="number"
                value={addOtherConfig?.amount ?? ""}
                onChange={(e) =>
                  setAddOtherConfig({
                    ...(addOtherConfig || defaultOtherConfig),
                    amount: +e.target.value,
                  })
                }
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={onAddOtherFormSubmit}>
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Configuration</h3>
        <p className="text-sm text-muted-foreground">
          Configure your exchanges, wallets, others addresses and other general
          settings.
        </p>
      </div>
      <Separator />
      <div className="space-y-5">
        <div className="text-l font-bold text-left">General</div>
        <div className="flex items-center space-x-2 mb-2">
          <Checkbox
            id="groupUSD"
            checked={groupUSD}
            onCheckedChange={(v) => onGroupUSDSelectChange(!!v)}
          />
          <Label
            htmlFor="groupUSD"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Group Stable Coins into USDT ( e.g. USDC, TUSD, DAI etc.)
          </Label>
        </div>
        <div className="space-y-2">
          <div className="text-sm font-bold text-left">Count of Results</div>
          <Select onValueChange={onQuerySizeChanged} value={querySize + ""}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Configure QuerySize" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Size</SelectLabel>
                {querySizeOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <div className="text-sm font-bold text-left">Base Currency</div>
          <Select
            onValueChange={onPreferCurrencyChanged}
            value={preferCurrency}
          >
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Configure Prefer Currency" />
            </SelectTrigger>
            <SelectContent className="overflow-y-auto max-h-[20rem]">
              <SelectGroup>
                <SelectLabel>Prefer Currency</SelectLabel>
                {preferCurrencyOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>
      <Separator />
      <div className="space-y-2">
        <div className="text-l font-bold text-left">Exchanges</div>
        {renderAddExchangeForm()}
        {renderExchangeForm(exchanges)}
      </div>
      <Separator />
      <div className="space-y-2">
        <div className="text-l font-bold text-left">Wallets</div>
        {renderAddWalletForm()}
        {renderWalletForm(wallets)}
      </div>
      <div className="space-y-2">
        <div className="text-l font-bold text-left">Others</div>
        {renderAddOtherForm()}
        {renderOthersForm(others)}
      </div>
    </div>
  );
};

export default Configuration;
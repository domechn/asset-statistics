import { useEffect, useMemo, useState } from "react";
import {
  deleteHistoricalDataByUUID,
  deleteHistoricalDataDetailById,
  queryHistoricalData,
} from "@/middlelayers/charts";
import { CurrencyRateDetail, HistoricalData } from "@/middlelayers/types";
import DeleteIcon from "@/assets/icons/delete-icon.png";
import _ from "lodash";

import { useToast } from "@/components/ui/use-toast";
import { timestampToDate } from "@/utils/date";
import {
  currencyWrapper,
  prettyNumberToLocaleString,
  prettyPriceNumberToLocaleString,
} from "@/utils/currency";
import { downloadCoinLogos } from "@/middlelayers/data";
import { appCacheDir as getAppCacheDir } from "@tauri-apps/api/path";
import { useWindowSize } from "@/utils/hook";
import ImageStack from "./common/image-stack";
import { getImageApiPath } from "@/utils/app";
import UnknownLogo from "@/assets/icons/unknown-logo.svg";
import bluebird from "bluebird";
import { Button } from "./ui/button";
import { ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { loadingWrapper } from "@/utils/loading";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { ScrollArea } from "./ui/scroll-area";

type RankData = {
  id: number;
  // real id in db
  assetId: number;
  rank: number;
  symbol: string;
  value: number;
  amount: number;
  price: number;
};

const App = ({
  afterDataDeleted,
  currency,
  version,
}: {
  // uuid is id for batch data
  // id is for single data
  afterDataDeleted?: (uuid?: string, id?: number) => unknown;
  currency: CurrencyRateDetail;
  version: number;
}) => {
  const { toast } = useToast();
  const [data, setData] = useState([] as HistoricalData[]);
  const [rankData, setRankData] = useState([] as RankData[]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [logoMap, setLogoMap] = useState<{ [x: string]: string }>({});

  const [loading, setLoading] = useState(false);

  const wsize = useWindowSize();

  const [dataPage, setDataPage] = useState<number>(0);

  const pageSize = 10;

  useEffect(() => {
    const symbols = _(data)
      .map((d) => d.assets)
      .flatten()
      .sortBy((d) => d.createdAt)
      .reverse()
      .uniqBy((d) => d.symbol)
      .map((d) => ({
        symbol: d.symbol,
        price: d.price,
      }))
      .value();

    downloadCoinLogos(symbols);

    getLogoMap(data).then((m) => setLogoMap(m));
  }, [data]);

  useEffect(() => {
    loadAllData();
  }, [version]);

  const maxDataPage = useMemo(() => {
    // - 0.000000000001 is for float number precision
    const mp = Math.floor(data.length / pageSize - 0.000000000001);
    return mp >= 0 ? mp : 0;
  }, [data]);

  async function getLogoMap(d: HistoricalData[]) {
    const acd = await getAppCacheDir();
    const kvs = await bluebird.map(
      _(d)
        .map((dd) => dd.assets)
        .flatten()
        .map("symbol")
        .value(),
      async (s) => {
        const path = await getImageApiPath(acd, s);
        return { [s]: path };
      }
    );

    return _.assign({}, ...kvs);
  }

  async function loadAllData() {
    setLoading(true);
    try {
      const d = await queryHistoricalData(-1);
      setData(d);
    } finally {
      setLoading(false);
    }
  }

  function onHistoricalDataDeleteClick(uuid: string) {
    deleteHistoricalDataByUUID(uuid)
      .then(() => {
        toast({
          description: "Record deleted",
        });
        loadAllData();
        if (afterDataDeleted) {
          afterDataDeleted(uuid);
        }
        // hide rank data when some data is deleted
        setRankData([]);
      })
      .catch((e) =>
        toast({
          description: e.message,
          variant: "destructive",
        })
      )
      .finally(() => {
        setIsModalOpen(false);
      });
  }

  function onHistoricalDataDetailDeleteClick(id: number) {
    deleteHistoricalDataDetailById(id)
      .then(() => {
        toast({
          description: "Record deleted",
        });
        loadAllData();
        if (afterDataDeleted) {
          afterDataDeleted(undefined, id);
        }

        setRankData(
          _(rankData)
            .filter((d) => d.assetId !== id)
            .value()
        );
      })
      .catch((e) =>
        toast({
          description: e.message,
          variant: "destructive",
        })
      );
  }

  function onRowClick(id: number | string) {
    const d = _(data).find((d) => d.id === id);
    if (!d) {
      return;
    }

    const revAssets = _(d.assets).sortBy("value").reverse().value();
    setRankData(
      _(d.assets)
        .map((asset, idx) => ({
          id: idx,
          assetId: asset.id,
          rank: _(revAssets).findIndex((a) => a.symbol === asset.symbol) + 1,
          amount: asset.amount,
          symbol: asset.symbol,
          value: asset.value,
          price: asset.price,
        }))
        .filter((d) => d.value > 1) // ignore value less than 1 dollar
        .sortBy("rank")
        .value()
    );

    setIsModalOpen(true);
  }

  function getUpOrDown(val: number) {
    const p = val > 0 ? "+" : val === 0 ? "" : "-";
    return p;
  }

  function renderHistoricalDataList() {
    return (
      data
        .map((d, idx) => {
          return (
            <Card
              className="group mb-2 cursor-pointer"
              key={"historical-card-" + idx}
              onClick={() => onRowClick(d.id)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pt-3 pb-4">
                <CardTitle className="text-sm font-medium pt-0 w-[100%]">
                  <div className="grid gap-4 grid-cols-12">
                    <div className="col-span-3 text-xl ">
                      {currency.symbol +
                        prettyNumberToLocaleString(
                          currencyWrapper(currency)(d.total)
                        )}
                    </div>
                    <div className="col-span-9 text-lg text-muted-foreground text-right">
                      {timestampToDate(new Date(d.createdAt).getTime(), true)}
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="w-[100%] pb-3">
                <div className="grid grid-cols-12">
                  <div className="col-span-3">
                    <div
                      style={{
                        color:
                          d.total - data[idx + 1]?.total > 0 ? "green" : "red",
                      }}
                    >
                      {idx < data.length - 1
                        ? getUpOrDown(d.total - data[idx + 1].total) +
                          currency.symbol +
                          prettyNumberToLocaleString(
                            currencyWrapper(currency)(
                              Math.abs(d.total - data[idx + 1].total)
                            )
                          )
                        : ""}
                    </div>
                  </div>
                  <div className="col-span-8">
                    <ImageStack
                      imageSrcs={_(d.assets)
                        .filter((a) => a.value > 0)
                        .sortBy("value")
                        .reverse()
                        .take(7)
                        .map((a) => logoMap[a.symbol] || UnknownLogo)
                        .value()}
                      imageWidth={23}
                      imageHeight={23}
                    />
                  </div>
                  <div className="col-span-1">
                    <div className="hidden group-hover:inline-block float-right">
                      <a onClick={() => onHistoricalDataDeleteClick(d.id)}>
                        <img
                          src={DeleteIcon}
                          alt="delete"
                          style={{
                            border: 0,
                            height: 18,
                            width: 18,
                          }}
                        />
                      </a>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })
        // TODO: slice first for better performance
        .slice(dataPage * pageSize, (dataPage + 1) * pageSize)
    );
  }

  function renderDetailPage(data: RankData[]) {
    return _(data)
      .map((d, idx) => {
        const apiPath = logoMap[d.symbol];
        return (
          <TableRow key={"historical-data-detail-row-" + idx}>
            <TableCell>
              <p># {d.rank}</p>
            </TableCell>
            <TableCell className="flex space-x-1">
              <img
                className="inline-block"
                src={apiPath}
                alt={d.symbol}
                style={{ width: 20, height: 20, marginRight: 5 }}
              />
              <p>{d.symbol}</p>
            </TableCell>
            <TableCell
              style={{
                textAlign: "end",
              }}
            >
              <p>
                {currency.symbol +
                  prettyPriceNumberToLocaleString(
                    currencyWrapper(currency)(d.price)
                  )}
              </p>
            </TableCell>
            <TableCell
              style={{
                textAlign: "end",
              }}
            >
              <p>{d.amount}</p>
            </TableCell>
            <TableCell
              style={{
                textAlign: "end",
              }}
            >
              <p>
                {currency.symbol +
                  prettyNumberToLocaleString(
                    currencyWrapper(currency)(d.value)
                  )}
              </p>
            </TableCell>
            <TableCell>
              <a onClick={() => onHistoricalDataDetailDeleteClick(d.assetId)}>
                <img
                  src={DeleteIcon}
                  alt="delete"
                  style={{
                    border: 0,
                    height: 20,
                    width: 20,
                  }}
                />
              </a>
            </TableCell>
          </TableRow>
        );
      })
      .value();
  }

  return (
    <div>
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="min-w-[80%]">
          <DialogHeader>
            <DialogTitle>Historical Data Detail</DialogTitle>
          </DialogHeader>
          <ScrollArea
            className="w-full"
            style={{
              maxHeight: (wsize.height ?? 800) * 0.8,
            }}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead>Opt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>{renderDetailPage(rankData)}</TableBody>
            </Table>
          </ScrollArea>
        </DialogContent>
      </Dialog>
      <div className="flex justify-center items-center mb-3 cursor-pointer">
        <div className="flex space-x-0 items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDataPage(Math.max(dataPage - 1, 0))}
            disabled={dataPage <= 0}
          >
            <ChevronLeftIcon />
          </Button>
          <div className="text-gray-800 text-sm">
            <Select
              value={dataPage + ""}
              onValueChange={(v) => {
                setDataPage(+v);
              }}
            >
              <SelectTrigger className="border-none shadow-none focus:ring-0">
                <SelectValue placeholder="Select Page" />
              </SelectTrigger>
              <SelectContent className="overflow-y-auto max-h-[20rem]">
                <SelectGroup>
                  {_.range(maxDataPage + 1).map((s) => (
                    <SelectItem key={"historical-idx-" + s} value={s + ""}>
                      {s + 1} {"/"} {maxDataPage + 1}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDataPage(Math.min(dataPage + 1, maxDataPage))}
            disabled={dataPage >= maxDataPage}
          >
            <ChevronRightIcon />
          </Button>
        </div>
      </div>
      {loadingWrapper(
        loading,
        <div className="w-[80%] ml-[10%]">{renderHistoricalDataList()}</div>,
        "my-[20px] h-[50px]",
        10
      )}
    </div>
  );
};

export default App;

import { useEffect, useState } from "react";
import {
  deleteHistoricalDataByUUID,
  deleteHistoricalDataDetailById,
  queryHistoricalData,
} from "@/middlelayers/charts";
import { CurrencyRateDetail, HistoricalData } from "@/middlelayers/types";
import DeleteIcon from "@/assets/icons/delete-icon.png";
import _ from "lodash";

import "./index.css";
import { useToast } from "@/components/ui/use-toast";
import { timestampToDate } from "@/utils/date";
import {
  currencyWrapper,
  prettyNumberToLocaleString,
  prettyPriceNumberToLocaleString,
} from "@/utils/currency";
import Modal from "../common/modal";
import { downloadCoinLogos } from "@/middlelayers/data";
import { appCacheDir as getAppCacheDir } from "@tauri-apps/api/path";
import { useWindowSize } from "@/utils/hook";
import ImageStack from "../common/image-stack";
import { getImageApiPath } from "@/utils/app";
import UnknownLogo from "@/assets/icons/unknown-logo.svg";
import bluebird from "bluebird";

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
}: {
  // uuid is id for batch data
  // id is for single data
  afterDataDeleted?: (uuid?: string, id?: number) => unknown;
  currency: CurrencyRateDetail;
}) => {
  const { toast } = useToast();
  const [data, setData] = useState([] as HistoricalData[]);
  const [rankData, setRankData] = useState([] as RankData[]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [logoMap, setLogoMap] = useState<{ [x: string]: string }>({});

  const wsize = useWindowSize();

  const [pageNum, setPageNum] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    const symbols = _(data)
      .map((d) => d.assets)
      .flatten()
      .sortBy(d=>d.createdAt)
      .reverse()
      .uniqBy(d=>d.symbol)
      .map(d=>({
        symbol: d.symbol,
        price: d.price,
      }))
      .value();
      
    downloadCoinLogos(symbols);

    getLogoMap(data).then((m) => setLogoMap(m));
  }, [data]);

  useEffect(() => {
    loadAllData();
  }, []);

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

  function loadAllData() {
    queryHistoricalData(-1).then((d) => setData(d));
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

  function onModalClose() {
    setIsModalOpen(false);
  }

  function getUpOrDown(val: number) {
    const p = val > 0 ? "+" : val === 0 ? "" : "-";
    return p;
  }

  function renderHistoricalDataList() {
    // split data into pages
    const idx = (pageNum - 1) * pageSize;
    return _(data)
      .map((d, idx) => {
        return (
          <div
            key={d.id}
            className="historical-data-card group"
            onClick={() => onRowClick(d.id)}
          >
            <div>
              <div className="historical-data-card-created-at">
                {timestampToDate(new Date(d.createdAt).getTime(), true)}
              </div>
              <div className="historical-data-card-total">
                {currency.symbol +
                  prettyNumberToLocaleString(
                    currencyWrapper(currency)(d.total)
                  )}
              </div>
            </div>

            <div className="historical-data-card-bottom">
              <div className="hidden group-hover:inline-block">
                <a onClick={() => onHistoricalDataDeleteClick(d.id)}>
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
              </div>
              <div
                style={{
                  position: "absolute",
                  left: "30%",
                }}
              >
                <ImageStack
                  imageSrcs={_(d.assets)
                    .sortBy("value")
                    .reverse()
                    .take(7)
                    .map((a) => logoMap[a.symbol] || UnknownLogo)
                    .value()}
                  imageWidth={25}
                  imageHeight={25}
                />
              </div>
              <div
                className="historical-data-card-bottom-changes"
                style={{
                  color: d.total - data[idx + 1]?.total > 0 ? "green" : "red",
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
          </div>
        );
      })
      .slice(idx, idx + pageSize)
      .value();
  }

  function page() {
    return _(data.length / pageSize)
      .range()
      .map((i) => {
        const curPageNum = i + 1;

        return (
          <a
            key={"his-page-" + curPageNum}
            onClick={() => setPageNum(curPageNum)}
            style={{
              color: curPageNum === pageNum ? "black" : "gray",
              marginRight: 10,
            }}
          >
            {curPageNum}
          </a>
        );
      })
      .value();
  }

  function renderDetailPage(data: RankData[]) {
    return _(data)
      .map((d) => {
        const apiPath = logoMap[d.symbol];
        return (
          <tr key={d.id}>
            <td>
              <p className="historical-data-detail-row">{d.rank}</p>
            </td>
            <td
              style={{
                textAlign: "start",
              }}
            >
              <img
                className="inline-block"
                src={apiPath}
                alt={d.symbol}
                style={{ width: 20, height: 20, marginRight: 5 }}
              />
              <p className="historical-data-detail-row">{d.symbol}</p>
            </td>
            <td
              style={{
                textAlign: "end",
              }}
            >
              <p className="historical-data-detail-row">
                {currency.symbol +
                  prettyPriceNumberToLocaleString(
                    currencyWrapper(currency)(d.price)
                  )}
              </p>
            </td>
            <td
              style={{
                textAlign: "end",
              }}
            >
              <p className="historical-data-detail-row">{d.amount}</p>
            </td>
            <td
              style={{
                textAlign: "end",
              }}
            >
              <p className="historical-data-detail-row">
                {currency.symbol +
                  prettyNumberToLocaleString(
                    currencyWrapper(currency)(d.value)
                  )}
              </p>
            </td>
            <td>
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
            </td>
          </tr>
        );
      })
      .value();
  }

  return (
    <div>
      <Modal visible={isModalOpen} onClose={onModalClose}>
        <div
          id="detail-view"
          style={{
            display: rankData.length > 0 ? "inline-block" : "none",
            width: (wsize.width ?? 800) * 0.8,
          }}
        >
          <table>
            <thead>
              <tr>
                <th
                  style={{
                    width: 50,
                  }}
                >
                  #
                </th>
                <th
                  style={{
                    width: "30%",
                    minWidth: 180,
                    textAlign: "start",
                  }}
                >
                  Name
                </th>
                <th
                  style={{
                    width: "20%",
                    textAlign: "end",
                  }}
                >
                  Price
                </th>
                <th
                  style={{
                    width: "25%",
                    textAlign: "end",
                  }}
                >
                  Amount
                </th>
                <th
                  style={{
                    width: "20%",
                    textAlign: "end",
                  }}
                >
                  Value
                </th>
                <th
                  style={{
                    width: "3%",
                    minWidth: 30,
                    textAlign: "end",
                  }}
                ></th>
              </tr>
            </thead>
            <tbody>{renderDetailPage(rankData)}</tbody>
          </table>
        </div>
      </Modal>
      <div className="flex justify-center items-center mb-5 text-gray-500 cursor-pointer">
        <a
          onClick={() => (pageNum > 1 ? setPageNum(pageNum - 1) : null)}
          style={{
            marginRight: 10,
            color: "gray",
          }}
        >
          {"<"}
        </a>
        {page()}
        <a
          onClick={() =>
            pageNum < data.length / pageSize ? setPageNum(pageNum + 1) : null
          }
          style={{
            color: "gray",
          }}
        >
          {">"}
        </a>
      </div>
      <div className="historical-data">{renderHistoricalDataList()}</div>
    </div>
  );
};

export default App;

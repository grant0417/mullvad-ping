import { parse } from "https://deno.land/std/flags/mod.ts";

type ServerDataJSON = {
  hostname: string;
  "country_code": string;
  "country_name": string;
  "city_code": string;
  "city_name": string;
  active: boolean;
  owned: boolean;
  provider: string;
  "ipv4_addr_in": string;
  "ipv6_addr_in": string;
  type: string;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const serverTypes = ["openvpn", "bridge", "wireguard", "all"];

const args = parse(Deno.args);
if (args.help == true) {
  console.log(`Usage: script [OPTION]
    --country <code>    the country you want to quary (eg. us, gb, de)
    --list-countries    lists the avaiable countries
    --type <type>       the type of server to quary (${serverTypes.join(", ")})
    --count <n>         the number of pings to the server (default 3)
    --interval <i>      the interval between pings in seconds (default/min 0.2)
    --top <n>           the number of top servers to show, (0=all)
    --help              usage infromation`);
  Deno.exit(0);
}

const country = args.country;
const serverType = args.type ?? "all";
if (!serverTypes.includes(serverType)) {
  console.error(`Invalid type, allowed types are: ${serverTypes.join(", ")}`);
  Deno.exit(1);
}

const interval = parseFloat(args.interval ?? 0.2) || 0.2;
if (interval < 0.2) {
  console.error("Minimum interval value is 0.2");
  Deno.exit(1);
}
const count = parseInt(args.count ?? 5) || 5;
const topN = parseInt(args.top ?? 5) || 5;

console.log("Fetching currently avaiable relays...");
const response = await fetch(
  `https://api.mullvad.net/www/relays/${serverType}/`,
);
const json: Array<ServerDataJSON> = await response.json();

if (args["list-countries"]) {
  const countries = new Set();
  json.forEach((e) => {
    countries.add(`${e.country_code} - ${e.country_name}`);
  });
  countries.forEach((e) => {
    console.log(e);
  });
} else {
  const results = [];

  for (const server of json) {
    if (
      (country == null || country == server.country_code)
    ) {
      const p = Deno.run({
        cmd: [
          "ping",
          "-c",
          count.toString(),
          "-i",
          interval.toString(),
          server.ipv4_addr_in,
        ],
        stdout: "piped",
      });

      const output = new TextDecoder().decode(await p.output());

      // [all, min, avg, max, mdev]
      const regex =
        /(?<min>\d+(?:.\d+)?)\/(?<avg>\d+(?:.\d+)?)\/(?<max>\d+(?:.\d+)?)\/(?<mdev>\d+(?:.\d+)?)/;

      const values = output.match(regex);
      if (values) {
        console.log(
          `Pinged ${server.hostname}.mullvad.net, min/avg/max/mdev ${
            values[0]
          }`,
        );

        results.push({
          hostname: server.hostname,
          city: server.city_name,
          country: server.country_name,
          type: server.type,
          ip: server.ipv4_addr_in,
          avg: parseFloat(values[2]) || 0,
        });
      }

      await sleep(interval * 1000);
    }
  }

  results.sort((a, b) => {
    return a.avg - b.avg;
  });

  const top = topN == 0 ? results : results.slice(0, topN);

  if (top.length > 0) {
    console.log(`\n\n\nTop ${top.length} results:`);

    for (const e of top) {
      console.log(
        ` - ${e.hostname}.mullvad.net (${
          e.avg.toFixed(1)
        }ms) ${e.type} ${e.city}, ${e.country}`,
      );
    }
    console.table()
  } else {
    console.error("No servers found");
  }
}

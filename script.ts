import { parseArgs, Spinner } from "https://deno.land/std@0.221.0/cli/mod.ts";
import {
  bold,
  cyan,
  green,
  red,
} from "https://deno.land/std@0.221.0/fmt/colors.ts";

const CLI_NAME = "mullvad-ping";
const VERSION = "v0.9.0";

type ServerData = {
  hostname: string;
  country_code: string;
  country_name: string;
  city_code: string;
  city_name: string;
  active: boolean;
  owned: boolean;
  provider: string;
  ipv4_addr_in: string;
  ipv6_addr_in: string;
  network_port_speed: number;
  stboot: boolean;
  type: string;
};

type ResultServerData = {
  avg: number;
  min?: number;
  max?: number;
  mdev?: number;
} & ServerData;

function error(...message: unknown[]) {
  console.error(red(bold("error:")), ...message);
  console.error();
  console.trace();
  Deno.exit(1);
}

const serverTypes = ["openvpn", "bridge", "wireguard", "all"];
const ownerTypes = ["mullvad", "rented", "all"];
const runTypes = ["ram", "disk", "all"];

const INTERVAL_DEFAULT = 0.2;
const COUNT_DEFAULT = 5;
const TOP_DEFAULT = 5;
const PORT_SPEED_DEFAULT = 0;
const RUN_MODE_DEFAULT = "all";
const OWNER_DEFAULT = "all";
const TYPE_DEFAULT = "all";

const args = parseArgs(Deno.args, {
  "--": false,
  string: [
    "country",
    "city-code",
    "type",
    "interval",
    "count",
    "top",
    "owner",
    "port-speed",
    "provider",
    "run-mode",
  ],
  boolean: [
    "help",
    "list",
    "list-countries",
    "list-cities",
    "list-providers",
    "include-inactive",
    "json",
    "version",
  ],
  alias: {
    c: "country",
    l: "list",
    t: "type",
    C: "count",
    n: "top",
    s: "port-speed",
    p: "provider",
    j: "json",
    h: "help",
    V: "version",
  },
  default: {
    interval: `${INTERVAL_DEFAULT}`,
    count: `${COUNT_DEFAULT}`,
    top: `${TOP_DEFAULT}`,
    "port-speed": `${PORT_SPEED_DEFAULT}`,
    "run-mode": RUN_MODE_DEFAULT,
    owner: OWNER_DEFAULT,
    type: TYPE_DEFAULT,
  },
  unknown: (arg) => {
    error(`Unknown argument ${arg}`);
  },
});

if (args.help) {
  const serverTypesStr = serverTypes.join(", ");
  const ownerTypesStr = ownerTypes.join(", ");
  const runTypesStr = runTypes.join(", ");

  // This help is formatted like cargo's help
  console.log(
    `Gets the list of Mullvad servers with the best latency according to ping

${green(bold("Usage:"))} ${cyan(bold(CLI_NAME))} ${cyan("[OPTIONS]")}

${green(bold("Options:"))}
  -c, --country <CODE>      the country you want to query (eg. us, gb, de)
      --city-code <CODE>    the city code you want to query (eg. nyc, lon)
  -l, --list                lists the available servers
      --list-countries      lists the available countries
      --list-cities         lists the available cities
      --list-providers      lists the available providers
  -t, --type <TYPE>         the type of server to query (${serverTypesStr})
  -C, --count <COUNT>       the number of pings to the server (default ${COUNT_DEFAULT})
  -n, --top <TOPN>          the number of top servers to show, (0=all, default ${TOP_DEFAULT})
  -s, --port-speed <SPEED>  only show servers with at least n Gbps port speed
  -p, --provider <NAME>     only show servers from the given provider
      --owner <OWNER>       only show servers by owner (${ownerTypesStr})
      --run-mode <TYPE>     only show servers running from (${runTypesStr})
      --include-inactive    include inactive servers
  -j, --json                output the results in JSON format
  -h, --help                display this help and exit
  -V, --version             display version information and exit`
      .replace(/(--?[a-zA-Z-]+)/g, cyan(bold("$1")))
      .replace(/(<[^>]+>)/g, cyan("$1")),
  );

  Deno.exit(0);
}

if (args.version) {
  console.log(CLI_NAME, VERSION);
  Deno.exit(0);
}

// Color output only if the input and output are terminals and not JSON
const isInteractive = Deno.stdout.isTerminal() && Deno.stdin.isTerminal() &&
  !args.json;

const country = args.country?.toLowerCase();
const cityCode = args["city-code"]?.toLowerCase();
const serverType = args.type.toLowerCase();
if (!serverTypes.includes(serverType)) {
  error(`Invalid type, allowed types are: ${serverTypes.join(", ")}`);
}

const interval = parseFloat(args.interval) || INTERVAL_DEFAULT;
if (interval < INTERVAL_DEFAULT) {
  error(`Minimum interval value is ${INTERVAL_DEFAULT}`);
}
const count = parseInt(args.count) || COUNT_DEFAULT;
const topN = parseInt(args.top) || TOP_DEFAULT;
const portSpeed = parseInt(args["port-speed"]) || PORT_SPEED_DEFAULT;

const owned = args.owner.toLowerCase();
if (!ownerTypes.includes(owned)) {
  error(`Invalid owner, allowed types are: ${ownerTypes.join(", ")}`);
}

const runMode = args["run-mode"].toLowerCase();
if (!runTypes.includes(runMode)) {
  error(`Invalid run-mode, allowed types are: ${runTypes.join(", ")}`);
}

// ensure that no more than 1 of list, list-countries, list-cities, list-providers is set
const listCount = [
  args.list,
  args["list-countries"],
  args["list-cities"],
  args["list-providers"],
].filter((e) => e).length;
if (listCount > 1) {
  error(
    "Only one of list, list-countries, list-cities, list-providers can be set",
  );
}

const provider = args.provider;

let fetchingSpinner: Spinner | undefined;
if (isInteractive) {
  fetchingSpinner = new Spinner({
    message: "Fetching currently available relays",
    color: "cyan",
  });
  fetchingSpinner.start();
}

const response = await fetch(
  `https://api.mullvad.net/www/relays/${serverType}/`,
);

if (fetchingSpinner) {
  fetchingSpinner.stop();

  console.log(green("✓"), "Fetched available relays");
  console.log();
}

function checkRunMode(stboot: boolean, runMode: string) {
  if (runMode === "all") {
    return true;
  } else if (runMode === "ram" && stboot === true) {
    return true;
  } else if (runMode === "disk" && stboot === false) {
    return true;
  }
  return false;
}

function checkOwnership(owned: string, server: ServerData) {
  if (owned === "all") {
    return true;
  } else if (owned === "mullvad" && server.owned) {
    return true;
  } else if (owned === "rented" && !server.owned) {
    return true;
  }
  return false;
}

const json: Array<ServerData> = await response.json();

const servers = json.filter(
  (server) =>
    (country === undefined || country === server.country_code) &&
    (cityCode === undefined || cityCode === server.city_code) &&
    server.network_port_speed >= portSpeed &&
    checkRunMode(server.stboot, runMode) &&
    (provider === undefined || provider === server.provider) &&
    checkOwnership(owned, server) &&
    (args["include-inactive"] || server.active),
);

if (args["list-countries"]) {
  const countries = new Map<string, string>();
  json.forEach((server) => {
    countries.set(server.country_code, server.country_name);
  });

  if (args.json) {
    console.log(JSON.stringify(Object.fromEntries(countries), null, 2));
  } else {
    // sort by country code
    const sortedCountries = Array.from(countries).sort((a, b) =>
      a[0].localeCompare(b[0])
    );
    for (const country of sortedCountries) {
      console.log(`${country[0]}: ${country[1]}`);
    }
  }
} else if (args["list-cities"]) {
  const cities = new Map<string, string>();
  json.forEach((server) => {
    cities.set(server.city_code, server.city_name);
  });

  if (args.json) {
    console.log(JSON.stringify(Object.fromEntries(cities), null, 2));
  } else {
    // sort by city code
    const sortedCities = Array.from(cities).sort((a, b) =>
      a[0].localeCompare(b[0])
    );
    for (const city of sortedCities) {
      console.log(`${city[0]}: ${city[1]}`);
    }
  }
} else if (args["list-providers"]) {
  const providers = new Set<string>();
  json.forEach((server) => {
    providers.add(server.provider);
  });

  if (args.json) {
    console.log(JSON.stringify(Array.from(providers), null, 2));
  } else {
    providers.forEach((provider) => {
      console.log(provider);
    });
  }
} else if (args.list) {
  if (args.json) {
    console.log(JSON.stringify(servers, null, 2));
  } else {
    for (const server of servers) {
      console.log(
        `${server.hostname}.mullvad.net, ${server.city_name}, ${server.country_name} (${server.network_port_speed} Gigabit ${server.type})`,
      );
    }
  }
} else {
  const results: ResultServerData[] = [];
  for (const server of servers) {
    let pingArgs = [];
    if (Deno.build.os === "windows") {
      pingArgs = ["-n", count.toString(), server.ipv4_addr_in];
    } else {
      pingArgs = [
        "-c",
        count.toString(),
        "-i",
        interval.toString(),
        server.ipv4_addr_in,
      ];
    }

    const p = new Deno.Command("ping", {
      args: pingArgs,
      stdout: "piped",
    });

    let pingSpinner: Spinner | undefined;
    if (isInteractive) {
      pingSpinner = new Spinner({
        message: server.hostname,
        color: "cyan",
      });
      pingSpinner.start();
    }

    const output = await p.output();

    if (pingSpinner) {
      pingSpinner.stop();
    }

    if (output.success) {
      const stdout = new TextDecoder().decode(output.stdout);

      if (Deno.build.os === "windows") {
        // [all, min, avg, max, mdev]
        const regex = /Average = (\d*)ms/;
        const avg = stdout.match(regex);
        if (avg) {
          if (!args.json) {
            console.log(
              isInteractive ? green("✓") : "",
              `${server.hostname}, avg ${avg[1]}ms`,
            );
          }

          results.push({
            ...server,
            avg: parseFloat(avg[1]) || 0,
          });
        }
      } else {
        // [all, min, avg, max, mdev]
        const regex =
          /(?<min>\d+(?:.\d+)?)\/(?<avg>\d+(?:.\d+)?)\/(?<max>\d+(?:.\d+)?)\/(?<mdev>\d+(?:.\d+)?)/;

        const values = stdout.match(regex);
        if (values) {
          if (!args.json) {
            console.log(
              isInteractive ? green("✓") : "",
              `${server.hostname}, min/avg/max/mdev ${values[0]}`,
            );
          }

          results.push({
            ...server,
            min: parseFloat(values[1]),
            avg: parseFloat(values[2]),
            max: parseFloat(values[3]),
            mdev: parseFloat(values[4]),
          });
        }
      }
    } else {
      if (!args.json) {
        console.log(
          isInteractive ? red("✗") : "",
          `${server.hostname} (${server.ipv4_addr_in}), failed to ping`,
        );
      }
    }
  }

  results.sort((a, b) => {
    return a.avg - b.avg;
  });

  if (args.json) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    const top = topN === 0 ? results : results.slice(0, topN);
    if (top.length > 0) {
      const preMsg = `\n\nTop ${top.length} results (lower avg is better)\n`;
      console.log(isInteractive ? bold(cyan(preMsg)) : preMsg);

      const hostnames = top.map((e) => e.hostname);
      const maxHostnameLength = Math.max(
        "Hostname".length,
        ...hostnames.map((e) => e.length),
      );

      const avg = top.map((e) => `${e.avg.toFixed(1)}ms`);
      const maxAvgLength = Math.max("Avg".length, ...avg.map((e) => e.length));

      const speeds = top.map((e) => `${e.network_port_speed} Gbps`);
      const maxSpeedLength = Math.max(
        "Speed".length,
        ...speeds.map((e) => e.length),
      );

      const countries = top.map((e) => e.country_name);
      const maxCountryLength = Math.max(
        "Country".length,
        ...countries.map((e) => e.length),
      );

      const cities = top.map((e) => e.city_name);
      const maxCityLength = Math.max(
        "City".length,
        ...cities.map((e) => e.length),
      );

      const provider = top.map((e) => e.provider);
      const maxProviderLength = Math.max(
        "Provider".length,
        ...provider.map((e) => e.length),
      );

      const ownership = top.map((e) => e.owned ? "Owned by Mullvad" : "Rented");
      const maxOwnershipLength = Math.max(
        "Ownership".length,
        ...ownership.map((e) => e.length),
      );

      const header = [
        "Hostname".padEnd(maxHostnameLength),
        "Avg".padEnd(maxAvgLength),
        "Speed".padEnd(maxSpeedLength),
        "Country".padEnd(maxCountryLength),
        "City".padEnd(maxCityLength),
        "Provider".padEnd(maxProviderLength),
        "Ownership".padEnd(maxOwnershipLength),
      ].join("   ");

      console.log(isInteractive ? bold(header) : header);
      console.log("─".repeat(header.length));

      for (let i = 0; i < top.length; i++) {
        console.log(
          [
            hostnames[i].padEnd(maxHostnameLength),
            avg[i].padEnd(maxAvgLength),
            speeds[i].padEnd(maxSpeedLength),
            countries[i].padEnd(maxCountryLength),
            cities[i].padEnd(maxCityLength),
            provider[i].padEnd(maxProviderLength),
            ownership[i].padEnd(maxOwnershipLength),
          ].join("   "),
        );
      }
    } else {
      error("No servers found");
    }
  }
}

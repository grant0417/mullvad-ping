import { parseArgs, Spinner } from "https://deno.land/std@0.221.0/cli/mod.ts";

type ServerDataJSON = {
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

function checkRunMode(stboot: boolean, runMode: string) {
  if (runMode == "all") {
    return true;
  } else if (runMode == "ram" && stboot == true) {
    return true;
  } else if (runMode == "disk" && stboot == false) {
    return true;
  }
  return false;
}

const serverTypes = ["openvpn", "bridge", "wireguard", "all"];
const runTypes = ["all", "ram", "disk"];

const args = parseArgs(Deno.args, {
  "--": false,
});

if (args.help == true) {
  console.log(`Usage: script [OPTION]
    --country <code>      the country you want to query (eg. us, gb, de)
    --list <plain|json>   lists the available servers
    --list-countries      lists the available countries
    --type <type>         the type of server to query (${
    serverTypes.join(", ")
  })
    --count <n>           the number of pings to the server (default 3)`);
  if (Deno.build.os != "windows") {
    console.log(
      `    --interval <i>        the interval between pings in seconds (default/min 0.2)`,
    );
  }
  console.log(
    `    --top <n>             the number of top servers to show, (0=all)
    --port-speed <n>      only show servers with at least n Gigabit port speed
    --provider <name>     only show servers from the given provider
    --owned <true|false>  only show servers owned by Mullvad
    --run-mode <type>     only show servers running from (${
      runTypes.join(", ")
    })
    --help                usage information`,
  );
  Deno.exit(0);
}

const country = args.country?.toLowerCase();
const serverType = args.type?.toLowerCase() ?? "all";
if (!serverTypes.includes(serverType)) {
  throw new Error(`Invalid type, allowed types are: ${serverTypes.join(", ")}`);
}

const interval = parseFloat(args.interval ?? 0.2) || 0.2;
if (interval < 0.2) {
  throw new Error("Minimum interval value is 0.2");
}
const count = parseInt(args.count ?? 5) || 5;
const topN = parseInt(args.top ?? 5) || 5;
const portSpeed = parseInt(args["port-speed"] ?? 0) || 0;

const runMode = args["run-mode"]?.toLowerCase() ?? "all";
if (!runTypes.includes(runMode)) {
  throw new Error(
    `Invalid run-mode, allowed types are: ${runTypes.join(", ")}`,
  );
}

let owned: boolean | null = null;
if (args.owned != null) {
  if (args.owned == "true") {
    owned = true;
  } else if (args.owned == "false") {
    owned = false;
  } else {
    throw new Error("Invalid value for owned, must be true or false");
  }
}

const provider = args.provider;

let fetchingSpinner: Spinner | undefined;
if (Deno.stdout.isTerminal()) {
  fetchingSpinner = new Spinner({
    message: "Fetching currently available relays...",
    color: "cyan",
  });
  fetchingSpinner.start();
}

const response = await fetch(
  `https://api.mullvad.net/www/relays/${serverType}/`,
);

if (fetchingSpinner) {
  fetchingSpinner.stop();

  console.log("Fetched available relays");
  console.log();
}

const json: Array<ServerDataJSON> = await response.json();

const servers = json.filter((server) =>
  (country == null || country == server.country_code) &&
  (server.network_port_speed >= portSpeed) &&
  checkRunMode(server.stboot, runMode) &&
  (provider == null || provider == server.provider) &&
  (owned == null || owned == server.owned)
);

if (args["list-countries"]) {
  const countries = new Set();
  json.forEach((e) => {
    countries.add(`${e.country_code} - ${e.country_name}`);
  });
  countries.forEach((e) => {
    console.log(e);
  });
} else if (args.list) {
  if (args.list == "json") {
    console.log(JSON.stringify(servers, null, 2));
  } else if (args.list == "plain" || args.list == true) {
    for (const server of servers) {
      console.log(
        `${server.hostname}.mullvad.net, ${server.city_name}, ${server.country_name} (${server.network_port_speed} Gigabit ${server.type})`,
      );
    }
  } else {
    throw new Error("Invalid list type, must be json or plain");
  }
} else {
  const results = [];

  for (const server of servers) {
    let args = [];
    if (Deno.build.os == "windows") {
      args = ["-n", count.toString(), server.ipv4_addr_in];
    } else {
      args = [
        "-c",
        count.toString(),
        "-i",
        interval.toString(),
        server.ipv4_addr_in,
      ];
    }

    const p = new Deno.Command(
      "ping",
      {
        args,
        stdout: "piped",
      },
    );

    let pingSpinner: Spinner | undefined;
    if (Deno.stdout.isTerminal()) {
      pingSpinner = new Spinner({
        message: `${server.hostname}.mullvad.net`,
        color: "cyan",
      });
      pingSpinner.start();
    }
    const output = new TextDecoder().decode((await p.output()).stdout);
    if (pingSpinner) {
      pingSpinner.stop();
    }

    if (Deno.build.os == "windows") {
      // [all, min, avg, max, mdev]
      const regex = /Average = (\d*)ms/;
      const avg = output.match(regex);
      if (avg) {
        console.log(`  ${server.hostname}.mullvad.net, avg ${avg[1]}ms`);

        results.push({
          hostname: server.hostname,
          city: server.city_name,
          country: server.country_name,
          type: server.type,
          ip: server.ipv4_addr_in,
          avg: parseFloat(avg[1]) || 0,
          network_port_speed: server.network_port_speed,
        });
      }
    } else {
      // [all, min, avg, max, mdev]
      const regex =
        /(?<min>\d+(?:.\d+)?)\/(?<avg>\d+(?:.\d+)?)\/(?<max>\d+(?:.\d+)?)\/(?<mdev>\d+(?:.\d+)?)/;

      const values = output.match(regex);
      if (values) {
        console.log(
          `  ${server.hostname}.mullvad.net, min/avg/max/mdev ${values[0]}`,
        );

        results.push({
          hostname: server.hostname,
          city: server.city_name,
          country: server.country_name,
          type: server.type,
          ip: server.ipv4_addr_in,
          avg: parseFloat(values[2]) || 0,
          network_port_speed: server.network_port_speed,
        });
      }
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
        }ms) ${e.network_port_speed} Gigabit ${e.type} ${e.city}, ${e.country}`,
      );
    }
    console.table();
  } else {
    console.error("No servers found");
  }
}

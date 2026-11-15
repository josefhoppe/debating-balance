# Debate Balance Simulator

The program is available [hosted on my website](https://hoppe.io/balancesim/).

The simulator simulates debate outcomes to test a topic for imbalance.
This works through different statistcis, namely the highest and lowest average points of any position, and the highest points any two positions got combined.

The distribution is correct as long as there is no correlation between team quality and position.
While the assignment of positions is influenced by previous rounds and performance therein, the previous positions were also randomly assigned; and with sufficiently many rooms, the assignment algorithm usually has more than enough degrees of freedom to make this assumption tenable.

Of course, as with any statistical test, it may fail to detect an effect.
Since we consider three separate (but somewhat linked) statistics *and* multiple rounds of a tournament, the p-value would have to be adjusted.
This is not currently implemented.

From a technical standpoint, the simulator fully runs in the browser and contains no tracking software; no entered values or tab data is ever sent to the server.

## Development

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

The project uses [Next.js](https://nextjs.org/docs) and React.

## Packaging

Run the build (with node.js >= 20.9)

```bash
npm run build
```

This writes the site to `out/`. `index.html` is the only page, and all dependencies are bundled alongside.
You can directly serve it with any webserver.

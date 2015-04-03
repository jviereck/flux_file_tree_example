Flux File Tree Example
----------------------

The following is the live coding part to the presentation ["Introduction to Flux"](https://speakerdeck.com/jviereck/introduction-to-flux).

To run the example, install the dependencies using `npm` via:

```bash
$ npm install
```

and then start the `webpack-dev-server` by executing:

```bash
$ webpack-dev-server
```

The webpage is then served at:

```
http://localhost:8080/webpack-dev-server/
```

There is an implementation based on Facebook's flux and one based on Flummox.
The FB one is inside of `scripts/index_fb.js` and the Flummox one under
`scripts/index_flummox.js`.

The flummox example doesn't use FluxComponent as described
[here](http://acdlite.github.io/flummox/docs/api/fluxcomponent) yet. PR to
make the example use it are more than welcome :)

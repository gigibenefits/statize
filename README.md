## Statize

> statize sequelize models

## Install

```sh
npm install
```

## Build

```sh
npm run build
```

## Run tests

```sh
npm run test
```

## Usage 

```js

// initialize along with model definition
class Matter extends Model {
  async onMelt() {
    console.log('i am melting');
  }
}

Matter.init({
  name: DataTypes.STRING,
  state: DataTypes.STRING,
}, {sequelize, modelName: 'matter'})

Statize.model(Matter, {
  field: 'state',
  init: 'solid',
  transitions: [
    { name: 'melt',     from: 'solid',  to: 'liquid' },
    { name: 'freeze',   from: 'liquid', to: 'solid'  },
    { name: 'vaporize', from: 'liquid', to: 'gas'    },
    { name: 'condense', from: 'gas',    to: 'liquid' }
  ]
});

// use like so
const iron = await Matter.create({
  name: 'iron',
});

console.log(iron.state) // solid (default as configured)

// this saves the iron
await iron.melt();

console.log(iron.state) // liquid

// can also change other properties before state change
iron.name = 'iron vapour'

await iron.vapourize();

console.log(iron.state) // gas
console.log(iron.name) // iron vapour

```
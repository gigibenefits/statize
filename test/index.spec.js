import Chai, {expect} from 'chai';
import {Sequelize, Model, DataTypes} from 'sequelize';
import Statize from '../src';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

Chai.use(sinonChai);

const sequelize = new Sequelize('sqlite::memory:');

// Implicit options
class ImplicitMatter extends Model {}

ImplicitMatter.init({
  name: DataTypes.STRING,
  state: DataTypes.STRING
}, {sequelize, modelName: 'implicit_matter'});

Statize.model(ImplicitMatter, {
  transitions: [
    {name: 'melt', from: 'solid', to: 'liquid'},
    {name: 'freeze', from: 'liquid', to: 'solid'},
    {name: 'vaporize', from: 'liquid', to: 'gas'},
    {name: 'condense', from: 'gas', to: 'liquid'}
  ]
});

// Matter with explicit state init and transitions
class Matter extends Model {
  async onMelt() {
    console.log('i am melting');
  }
}

Matter.init({
  name: DataTypes.STRING,
  state: DataTypes.STRING
}, {sequelize, modelName: 'matter'});

Statize.model(Matter, {
  field: 'state',
  init: 'solid',
  transitions: [
    {name: 'melt', from: 'solid', to: 'liquid'},
    {name: 'freeze', from: 'liquid', to: 'solid'},
    {name: 'vaporize', from: 'liquid', to: 'gas'},
    {name: 'condense', from: 'gas', to: 'liquid'}
  ]
});

before(async () => {
  console.log('init sequelize');
  await sequelize.sync();
});

describe('statize', () => {
  const sandbox = sinon.createSandbox();

  beforeEach(() => {
    sandbox.spy(Matter.prototype, 'onMelt');
    sandbox.spy(Matter.prototype, 'save');
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should have state set by default', async () => {
    const ice = await Matter.create({
      name: 'ice'
    });

    expect(ice.state).to.eq('solid');
  });

  it('should have changed state in database on transition', async () => {
    const iron = await Matter.create({
      name: 'iron'
    });

    expect(iron.state).to.eq('solid');

    iron.name = 'molten_iron';
    await iron.melt();

    const reloadedIron = await iron.reload();

    expect(reloadedIron.state).to.eq('liquid');
  });

  it('should call onTrasition method on model instance', async () => {
    const iron = await Matter.create({
      name: 'iron'
    });

    expect(iron.state).to.eq('solid');

    iron.name = 'molten_iron';
    await iron.melt();

    const reloadedIron = await iron.reload();

    expect(reloadedIron.state).to.eq('liquid');

    /* eslint-disable no-unused-expressions */
    expect(Matter.prototype.onMelt).to.have.been.calledOnce;
    /* eslint-enable no-unused-expressions */
  });

  it('should pass options to model instance save method', async () => {
    const iron = await Matter.create({
      name: 'iron'
    });

    const options = {
      hello: 'world'
    };

    expect(iron.state).to.eq('solid');

    iron.name = 'molten_iron';
    await iron.melt(options);

    const reloadedIron = await iron.reload();

    expect(reloadedIron.state).to.eq('liquid');

    expect(Matter.prototype.save).to.have.been.calledWith(options);
  });

  it('should throw when state is not declared', async () => {
    try {
      await Matter.create({
        name: 'foobar',
        state: 'fluid'
      });
    } catch (error) {
      expect(error.message).to.eq('unknown state "fluid"');
    }
  });

  it('should be able to transition with sm with no instance passed to transition', async () => {
    const solid = await Matter.create({
      name: 'foobar',
      state: 'solid'
    });

    solid.sm().melt();

    // As the instance does not know about it
    expect(solid.state).to.eq('solid');
  });

  it('should be able to transition with no after transition hooks', async () => {
    const liquid = await Matter.create({
      name: 'water',
      state: 'liquid'
    });

    await liquid.freeze();

    // No onFreeze handler
    expect(liquid.state).to.eq('solid');
  });

  it('should default field and init if not provided', async () => {
    const liquid = await ImplicitMatter.create({
      name: 'water',
      state: 'liquid'
    });

    await liquid.freeze();

    // No onFreeze handler
    expect(liquid.state).to.eq('solid');
  });
});

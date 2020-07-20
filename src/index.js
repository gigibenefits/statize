import StateMachine from 'javascript-state-machine';
import debugInit from 'debug';

const debug = debugInit('statize');

const ucFirst = function (string) {
  return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
};

export default class Statize {
  static model(Model, options) {
    const {field = 'state', init = 'none', transitions} = options;

    const getSM = initState => {
      return new StateMachine({
        transitions,
        init: initState,
        methods: {
          onBeforeTransition(event, instance, options) {
            debug('%s | onBefore | %s ( %s -> %s )', Model.name, event.transition, event.from, event.to);

            if (event.transition === 'init') {
              return true;
            }

            if (!instance) {
              return;
            }

            debug('saving %s instance', Model.name);

            instance.set(field, event.to);

            return instance.save(options);
          },

          onAfterTransition(event, instance) {
            debug('%s | onAfter | %s ( %s -> %s )', Model.name, event.transition, event.from, event.to);

            if (event.transition === 'init') {
              return true;
            }

            if (!instance) {
              return true;
            }

            const hook = `on${ucFirst(event.transition)}`;

            if (typeof instance[hook] === 'function') {
              debug('called %s on %s instance', hook, Model.name);

              return instance[hook]();
            }

            return true;
          }
        }
      });
    };

    const states = getSM(init).allStates();

    Model.prototype.sm = function () {
      const initState = this.get(field);

      return getSM(initState);
    };

    Model.addHook('beforeSave', async (instance, _) => {
      let state = instance.get(field);

      if (typeof state === 'undefined') {
        instance.set(field, init);

        state = init;
      }

      if (!states.includes(state)) {
        throw new Error(`unknown state "${state}"`);
      }
    });

    transitions.forEach(async transition => {
      Model.prototype[transition.name] = async function (options = {}) {
        const sm = this.sm();

        return sm[transition.name](this, options);
      };
    });
  }
}

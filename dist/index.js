"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _javascriptStateMachine = _interopRequireDefault(require("javascript-state-machine"));

var _debug = _interopRequireDefault(require("debug"));

var _lodash = _interopRequireDefault(require("lodash"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const debug = (0, _debug.default)('statize');

const ucFirst = function (string) {
  const camelCase = _lodash.default.camelCase(string);

  return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
};

class Statize {
  static model(Model, options) {
    const {
      field = 'state',
      init = 'none',
      transitions
    } = options;

    const getSM = initState => {
      return new _javascriptStateMachine.default({
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

exports.default = Statize;
/* eslint-disable */

'use strict'

require('./common.spec')

const EventBus = require('../src/eventbus')
const Discovery = require('../src/discovery')
const EventBroker = require('../src/eventbroker')
const LoggerFactory = require('../src/LoggerFactory')
const DefaultGreeting = 'Hello World';
const Arg1 = {name: 'Hello'};
const Arg2 = () => {
};

describe('EventBus', () => {

  /*
   describe('Constructor', () => {

   it('should be created with two properties: discoveryClient, and broker callback', () => {

   var DiscoveryStub = sinon.spy(function () {
   return sinon.createStubInstance(Discovery);
   });


   var discovery = new DiscoveryStub();
   expect(DiscoveryStub).to.have.been.calledWithNew;
   discovery.client.returns({name: 'discovery stub'});

   //sinon.createStubInstance(Discovery);
   //let discovery = new Discovery();
   //sinon.stub(discovery, 'constructor').returns({name:'discovery stub'});
   //sinon.stub(discovery, 'client').returns({name:'discovery stub'});
   //expect(discovery.client()).to.have.property('name');
   //expect(discovery.client().name).to.equals('discovery stub');

   sinon.createStubInstance(EventBroker);
   let broker = new EventBroker({name: 'discovery stub'});
   // sinon.stub(broker).returns();
   //expect(discovery.client()).to.have.length(2)

   let sut = new EventBus(Arg1, Arg2);
   //expect(discovery.client().name).to.equal('discovery stub');
   expect(discovery.client).to.have.been.calledOnce;

   //sut.logger = logger;

   expect(sut).to.have.property('discoveryClient');
   expect(sut).to.have.property('broker');
   });

   });
   */

  describe('Run', () => {

  });

});

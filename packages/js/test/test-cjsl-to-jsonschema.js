const { expect } = require('chai');
const { compactToStandard } = require('../src/cjsl-to-jsonschema');

describe('compactToStandard', () => {
    it('should parse unstructured', () => {
        const compact = {
            id: 'test',
            data: 'string'
        };
        const expectedStandard = {
            $id: 'test',
            type: 'string'
        };
        const standard = compactToStandard(compact);
        expect(standard).to.deep.equal(expectedStandard);
    });

    it('should parse array on property', () => {
        const compact = {
            id: 'test',
            'data[]': 'string'
        };
        const expectedStandard = {
            $id: 'test',
            type: 'array',
            items: {
                type: 'string'
            }
        };
        const standard = compactToStandard(compact);
        expect(standard).to.deep.equal(expectedStandard);
    });

    it('should parse array on value', () => {
        const compact = {
            id: 'test',
            'data': '[string]'
        };
        const expectedStandard = {
            $id: 'test',
            type: 'array',
            items: {
                type: 'string'
            }
        };
        const standard = compactToStandard(compact);
        expect(standard).to.deep.equal(expectedStandard);
    });

    it('should parse dictionary on property', () => {
        const compact = {
            id: 'test',
            'data{}': 'string'
        };
        const expectedStandard = {
            $id: 'test',
            type: 'object',
            additionalProperties: {
                type: 'string'
            }
        };
        const standard = compactToStandard(compact);
        expect(standard).to.deep.equal(expectedStandard);
    });

    it('should parse dictionary on value', () => {
        const compact = {
            id: 'test',
            'data': '{string}'
        };
        const expectedStandard = {
            $id: 'test',
            type: 'object',
            additionalProperties: {
                type: 'string'
            }
        };
        const standard = compactToStandard(compact);
        expect(standard).to.deep.equal(expectedStandard);
    });

    it('should parse constant', () => {
        const compact = {
            id: 'test',
            'data=': 'my test'
        };
        const expectedStandard = {
            $id: 'test',
            const: 'my test'
        };
        const standard = compactToStandard(compact);
        expect(standard).to.deep.equal(expectedStandard);
    });

    it('should parse n-tuple on property', () => {
        const compact = {
            id: 'test',
            'data()': ['string', 'boolean', 'number']
        };
        const expectedStandard = {
            $id: 'test',
            type: 'array',
            items: [
                { type: 'string' },
                { type: 'boolean' },
                { type: 'number' }
            ],
            additionalItems: false
        };
        const standard = compactToStandard(compact);
        expect(standard).to.deep.equal(expectedStandard);
    });

    it('should parse n-tuple on value', () => {
        const compact = {
            id: 'test',
            'data': '(string,boolean,number)'
        };
        const expectedStandard = {
            $id: 'test',
            type: 'array',
            items: [
                { type: 'string' },
                { type: 'boolean' },
                { type: 'number' }
            ],
            additionalItems: false
        };
        const standard = compactToStandard(compact);
        expect(standard).to.deep.equal(expectedStandard);
    });

    it('should parse reference', () => {
        const compact = {
            id: 'test',
            data: '@something'
        };
        const expectedStandard = {
            $id: 'test',
            $ref: 'something'
        };
        const standard = compactToStandard(compact);
        expect(standard).to.deep.equal(expectedStandard);
    });

    it('should parse local reference', () => {
        const compact = {
            id: 'test',
            data: '@#something',
            locals: {
                something: 'string'
            }
        };
        const expectedStandard = {
            $id: 'test',
            $ref: '#/$defs/something',
            $defs: {
                something: {
                    type: 'string'
                }
            }
        };
        const standard = compactToStandard(compact);
        expect(standard).to.deep.equal(expectedStandard);
    });

    it('should parse any of', () => {
        const compact = {
            id: 'test',
            'data#': ['string', 'boolean']
        };
        const expectedStandard = {
            $id: 'test',
            anyOf: [
                { type: 'string' },
                { type: 'boolean' }
            ]
        };
        const standard = compactToStandard(compact);
        expect(standard).to.deep.equal(expectedStandard);
    });

    it('should parse one of', () => {
        const compact = {
            id: 'test',
            'data#1': ['string', 'boolean']
        };
        const expectedStandard = {
            $id: 'test',
            oneOf: [
                { type: 'string' },
                { type: 'boolean' }
            ]
        };
        const standard = compactToStandard(compact);
        expect(standard).to.deep.equal(expectedStandard);
    });

    it('should parse all of', () => {
        const compact = {
            id: 'test',
            'data#&': ['string', 'boolean']
        };
        const expectedStandard = {
            $id: 'test',
            allOf: [
                { type: 'string' },
                { type: 'boolean' }
            ]
        };
        const standard = compactToStandard(compact);
        expect(standard).to.deep.equal(expectedStandard);
    });

    it('should parse required', () => {
        const compact = {
            id: 'test',
            data: {
                prop1: 'string',
                '!prop2': 'number'
            }
        };
        const expectedStandard = {
            $id: 'test',
            type: 'object',
            required: [
                'prop2'
            ],
            properties: {
                prop1: {
                    type: 'string'
                },
                prop2: {
                    type: 'number'
                }
            }
        };
        const standard = compactToStandard(compact);
        expect(standard).to.deep.equal(expectedStandard);
    });

     it('should parse enum', () => {
        const compact = {
            id: 'test',
            'data=1': ['one', 'two']
        };
        const expectedStandard = {
            $id: 'test',
            enum: [
                'one',
                'two'
            ]
        };
        const standard = compactToStandard(compact);
        expect(standard).to.deep.equal(expectedStandard);
    });

    it('should parse literal', () => {
        const compact = {
            id: 'test',
            'data$$': {
                enum: ['one', 'two']
            }
        };
        const expectedStandard = {
            $id: 'test',
            enum: [
                'one',
                'two'
            ]
        };
        const standard = compactToStandard(compact);
        expect(standard).to.deep.equal(expectedStandard);
    });

    it('should terminate', () => {
        const compact = {
            id: 'test',
            data: 'unknown'
        };
        expect(() => compactToStandard(compact)).to.throw();
    });
});

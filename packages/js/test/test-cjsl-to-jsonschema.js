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

    it('should parse n-tuple', () => {
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
});

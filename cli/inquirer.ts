const inquirerLib = require('inquirer')
const BCHJS = require('@chris.troutner/bch-js')
const bchjs = new BCHJS()

module.exports = {
    askConfigFileQuestions: () => {
        const questions = [
            {
                name: 'continueConfig',
                type: 'confirm',
                default: false,
                message: 'There is a configuration file already in place. Do you want to continue? All data will be lost. ',
            }
        ]
        return inquirerLib.prompt(questions)
    },
    askWalletAndPostageQuestions: () => {
        const questions = [
            {
                name: 'network',
                type: 'list',
                choices: ['mainnet', 'testnet'],
                message: 'Choose a BCH network to connect: ',
            },
            {
                name: 'mnemonic',
                type: 'input',
                message: 'Enter your seed phrase for the Post Office wallet:',
                validate: function(value) {
                    if (value.length) {
                        return true
                    } else {
                        return 'Please enter your mnemonic.'
                    }
                },
            },
            {
                name: 'slpAddress',
                type: 'input',
                message: `Enter your SLP Address, which will receive all paid postage:`,
                filter: value => {
                    const isSLPAddress = bchjs.SLP.Address.isSLPAddress(value)
                    if (!isSLPAddress)
                        return ''
                    return value
                },
                validate: (value): boolean | string => {
                    try {
                        const isSLPAddress = bchjs.SLP.Address.isSLPAddress(value)
                        if(!isSLPAddress)
                            throw Error('Please enter a valid SLP Address')
                        return true
                    } catch (e) {
                        return 'Please enter a valid SLP Address'
                    }
                },
            },
            {
                name: 'weight',
                type: 'number',
                message: 'Enter the stamp weight (in satoshis):',
                default: 365,
                validate: function(value) {
                    if (!isNaN(value)) {
                        return true
                    } else {
                        return 'Please enter the desired stamp weight.'
                    }
                },
            },
        ]
        return inquirerLib.prompt(questions)
    },
    askStampQuestions: () => {
        const questions = [
            {
                name: 'tokenDetails',
                type: 'input',
                message: 'Enter the token id for this stamp: ',
                filter: async function(value) {
                    const tokenDetails = await bchjs.SLP.Utils.list(value)
                    if (tokenDetails.id === 'not found') return 'Token not found'
                    return `${tokenDetails.name} (${tokenDetails.id})`
                },
            },
            {
                name: 'rate',
                type: 'number',
                message: 'Enter how many tokens will be charged per stamp: ',
                when: (answers): boolean => {
                    return answers.tokenDetails !== 'Token not found';
                },
                validate: (value): boolean | string =>{
                    if (!isNaN(value)) {
                        return true
                    } else {
                        return 'Please enter a valid amount.'
                    }
                },
            },
            {
                name: 'moreStamps',
                type: 'confirm',
                default: false,
                message: 'Add more stamps? ',
            },
        ]

        return inquirerLib.prompt(questions)
    },
}

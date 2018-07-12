const inquirer = require('inquirer');
/**
 * generate custom prompts for interactive shell
 */
module.exports = async () => {
    const answers = await inquirer
        .prompt([{
                type: 'confirm',
                name: 'full',
                message: 'Split into one audio file.',
                default: false,
            },
            {
                type: 'confirm',
                name: 'rename',
                message: 'Remove brackets from filenames',
                default: false,
            },
            {
                type: 'confirm',
                name: 'cover',
                message: 'Generate cover',
                default: false,
            },
            {
                type: 'confirm',
                name: 'isName',
                message: 'Add Custom album name',
                default: false,
            },
            {
                type: 'input',
                name: 'name',
                message: 'Enter custom album name',
                default: "",
                when: answers => answers.isName
            },
            {
                type: 'confirm',
                name: 'metadata',
                message: 'Combine clips into one album',
                default: false,
                when: answers => (!answers.cover) && (!answers.isName)
            },
            {
                type: 'input',
                name: 'startAt',
                message: 'seek from start',
                default: '0:00',
                when: answers => !answers.full
            },
            {
                type: 'input',
                name: 'endAt',
                message: 'seek from end',
                default: '0:00',
                when: answers => !answers.full
            },
            {
                type: 'input',
                name: 'duration',
                message: 'duration of clips',
                default: '03:00',
                when: answers => !answers.full
            },
        ]);
     
    answers.metadata = answers.cover ||answers.name ? true : answers.metadata;
    answers.name = answers.name || "";
    answers.startAt = answers.startAt || 0;
    answers.endAt = answers.endAt || 0;
    answers.duration = answers.duration || 180;
    return answers;
};
const express = require('express')
const memoryjs = require('memoryjs')
const colors = require('colors')
const config = require('./config.json')
const playerPointer = config.playerPointer
const playerOffset = config.playerOffset
const player = config.player

const app = express()

const sv = class {
  constructor() {
    this.player = player
    this.info = a => {
      console.info('-----------------------'.grey)
      console.info('Name:'.yellow, this.processName)
      console.info('ProcessID:'.yellow, this.processID)
      console.info('-----------------------'.grey)
    }
    this.findProcess = callback => {
      memoryjs.getProcesses(function(err, processes){
        let found = false
        processes.forEach(process => {
          if (process.szExeFile.toLowerCase().search('stardew') !== -1 && process.szExeFile.toLowerCase().search('valley') !== -1) {
            found = true
            callback(null, process)
          }
        })
        !found && callback('Stardew Valley was not Found!')
      })
    }
    this.errorRetry = (fnc, timeout, callback) => {
      fnc((err, data)=>{
        if (!err) {
          callback(data)
        } else {
          console.error('ERROR:'.red, err)
          console.error('retrying in ' + timeout + 'ms...'.grey)
          setTimeout(() => {
            this.errorRetry(fnc, timeout, callback)
          }, timeout)
        }
      })
    }
    this.resolveProcess = process => {
      this.process = process
      this.processName = process.szExeFile
      this.processID = process.th32ProcessID
    }
    this.openProcess = callback => {
      memoryjs.openProcess(this.processName, callback)
    }
    this.getBaseAddress = (modBaseAddr, callback) => {
      memoryjs.readMemory(modBaseAddr + parseInt(config.baseOffset), memoryjs.DWORD, callback)
    }
    this.getModule = callback => {
      memoryjs.findModule('NahimicMSIOSD.dll', this.processID, callback)
    }
    this.getMultiPointer = (multiPointer, baseAddress, errorMsg, timeout, callback) => {
      let currentOffset = 0
      let currentAddress = 0
      for (var i = 0; i < multiPointer.length; i++) {
        currentOffset = i === 0 ? baseAddress + parseInt(multiPointer[i]) : currentAddress + parseInt(multiPointer[i])
        currentAddress = memoryjs.readMemory(currentOffset, memoryjs.DWORD)
        if (currentAddress === 0x0) {
          console.error('ERROR:'.red, errorMsg)
          console.error('retrying in ' + timeout + 'ms...'.grey)
          return setTimeout(function() {
            stardew.getMultiPointer(multiPointer, baseAddress, errorMsg, timeout, callback)
          }, timeout)
        }
      }
      return callback(null, currentAddress + parseInt(playerOffset))
    }
    this.initPlayer = (playerAdress, callback) => {
      this.playerAdress = playerAdress
      let keys = Object.keys(this.player)
      for (var i = 0; i < keys.length; i++) {
        this.player[keys[i]].read = function (callback) {
          return memoryjs.readMemory(stardew.playerAdress + parseInt(this.o), this.t)
        }
        this.player[keys[i]].write = function (data) {
          return memoryjs.writeMemory(stardew.playerAdress + parseInt(this.o), data, this.t)
        }
      }
      callback && callback(this.player)
    }
  }
}

let stardew = new sv()
stardew.errorRetry(stardew.findProcess, 1000, process => {
  stardew.resolveProcess(process)
  stardew.info()
  stardew.openProcess((err, processObject) => {
    stardew.getModule((err, module) => {

      stardew.getBaseAddress(module.modBaseAddr, baseAddress => {
        console.info('BaseAddress:'.yellow, '0x' + baseAddress.toString(16))

        stardew.getMultiPointer(playerPointer, baseAddress, 'Player not found. Load a savegame!', 1000, (err, playerAdress) => {
          console.log('playerAdress:'.yellow, '0x' + playerAdress.toString(16))

          stardew.initPlayer(playerAdress, player => {

            player.money.write(133337)
            player.maxStamina.write(500)

          })
        })
      })
    })
  })
})
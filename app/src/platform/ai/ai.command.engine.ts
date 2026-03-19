import { AICommand } from "./ai.types"

export class AICommandEngine {

  private commands:Record<string,AICommand> = {}

  register(command:AICommand){
    this.commands[command.name] = command
  }

  execute(name:string,payload?:any){

    const command = this.commands[name]

    if(!command){
      throw new Error("Command not found: " + name)
    }

    return command.execute(payload)
  }

  list(){
    return Object.values(this.commands)
  }

}

export const aiCommandEngine = new AICommandEngine()

import { Log } from '@editablejs/utils'
import type { IElement, NodeData, ElementObject, ElementOptions, INode, NodeOptions, NodeKey, ElementStyle } from './types';
import Node from './node';
import Text from './text';
import { DATA_TYPE_ELEMENT, DATA_TYPE_TEXT } from '@editablejs/constants';
export default class Element<T extends NodeData = NodeData> extends Node<T> implements IElement<T> {
  
  protected children: INode[] = []
  protected style: ElementStyle = {}
  
  static create = <T extends NodeData = NodeData>(options: ElementOptions<T>): IElement<T> => {
    return new Element(options)
  }

  static from = <T extends NodeData = NodeData, N extends INode<T> = INode<T>>(options: NodeOptions<T>): N => { 
    if (Text.isTextObject(options)) return Text.create(options) as unknown as N
    else if(Element.isElementObject(options)) return Element.create(options) as unknown as N
    return Node.create(options) as unknown as N
  }

  static isElement = (node: INode): node is IElement => { 
    return node.getType() !== DATA_TYPE_TEXT
  }

  static isElementObject = (nodeObj: NodeOptions): nodeObj is ElementObject => { 
    return nodeObj.type !== DATA_TYPE_TEXT
  }

  constructor(options: ElementOptions<T>) { 
    super(Object.assign({}, options, { type: options.type ?? DATA_TYPE_ELEMENT }))
    this.children = (options.children || []).map(child => this.createChildNode(child))
  }

  protected createChildNode(options: NodeOptions<T>): INode { 
    const parent = this.getKey()
    options.parent = parent
    return Element.from(options)
  }

  getStyle(): ElementStyle {
    return Object.assign({}, this.style)
  }

  setStyle(style: ElementStyle) {
    this.style = Object.assign({}, style);
  }


  getChildrenSize(): number {
    return this.children.length
  }

  getChildrenKeys(): string[] {
    return this.children.map(child => child.getKey())
  }

  getChildren(): INode[] {
    return this.children
  }

  appendChild(child: INode): void {
    this.children.push(this.createChildNode(child.toJSON()))
  }

  removeChild(key: NodeKey): void {
    const index = this.children.findIndex(child => child.getKey() === key)
    if(index < 0) Log.nodeNotFound(key)
    this.children.splice(index, 1)
  }

  first(): INode | null {
    return this.children[0] || null
  }

  last(): INode | null {
    return this.children[this.children.length - 1] || null
  }

  insert(index: number, ...child: INode[]): void {
    this.children.splice(index, 0, ...child.map(c => this.createChildNode(c.toJSON())))
  }

  split(offset: number){
    const size = this.getChildrenSize()
    if(offset < 0 || size < offset) Log.offsetOutOfRange(this.getKey(), offset)
    const left = this.children.slice(0, offset)
    const right = this.children.slice(offset)
    // Cut out one value, keep the key
    const keepKey = left.length === 0 || right.length === 0
    const key = keepKey ? this.key : undefined
    const json = Object.assign({}, this.toJSON(false), { key })
    const cloneLeft = left.length > 0 ? Element.create(Object.assign({}, json, { key: this.key })) : null
    left.forEach(child => cloneLeft?.appendChild(child))
    const cloneRight = right.length > 0 ? Element.create(json) : null
    right.forEach(child => cloneRight?.appendChild(child))
    return [cloneLeft, cloneRight]
  }

  empty(): void {
    this.children = []
  }

  contains(...keys: NodeKey[]): boolean {
    if(keys.length === 0) return false
    for(const child of this.children) {
      if(keys.includes(child.getKey())) return true
      if(Element.isElement(child) && child.contains(...keys)) return true
    }
    return false
  }

  indexOf(key: NodeKey): number {
    return this.children.findIndex(child => child.getKey() === key)
  }

  clone(deep?: boolean): IElement {
    const json = this.toJSON(deep)
    return Element.create(deep ? json : Object.assign({}, json, { key: undefined, children: [] }))
  }

  toJSON<E extends ElementObject<T> = ElementObject<T>>(includeChild: boolean = true): E {
    const json = super.toJSON() as E
    if(includeChild) json.children = this.children.map(child => child.toJSON())
    return json
  }
}
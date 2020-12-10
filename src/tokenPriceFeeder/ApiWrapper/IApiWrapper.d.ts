export default interface IApiWrapper {
    getPrice: () => Promise<number>
}
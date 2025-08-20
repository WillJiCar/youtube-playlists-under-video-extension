

export const Skeleton = (props?: { pulse?: boolean, children?: React.ReactElement, version?: string }) => {

    const { children, pulse, version } = props ?? {};

    return(
        <>
            {children}
            <div className="flex h-10">
                <div className={`w-8 h-8 bg-gray-300 rounded-sm ${pulse && "animate-pulse"}`} />
                <div className="flex flex-col gap-1 ml-2">
                    <div className={`w-12 h-3 bg-gray-300 rounded ${pulse && "animate-pulse"}`} />
                    <div className={`w-20 h-3 bg-gray-200 rounded ${pulse && "animate-pulse"}`} />
                </div>
                <div className="flex flex-col gap-1 ml-auto text-xs">
                    <div className="text-xs text-right text-gray-400 ">{version}</div>
                    <div className="w-8 h-3 bg-gray-200 rounded" />
                </div>
            </div>

            <div className="flex flex-col gap-2 mt-4">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex h-8">
                        <div className={`w-8 h-8 bg-gray-300 rounded ${pulse && "animate-pulse"}`} />
                        <div className="flex flex-col w-full gap-1 ml-2">
                            <div className={`w-3/4 h-3 bg-gray-300 rounded ${pulse && "animate-pulse"}`} />
                            <div className={`w-1/3 h-3 bg-gray-200 rounded ${pulse && "animate-pulse"}`} />
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex gap-4 mt-auto">
                <div className="w-16 h-5 bg-gray-300 rounded" />
                <div className="w-16 h-5 bg-gray-300 rounded" />
                <div className="w-24 h-5 ml-auto bg-gray-300 rounded" />
            </div>
        </>
    )
}
export default Skeleton;
let s = [{award:120000,type:0},
    {award:40000,type:0},
    {award:16000,type:0},
    {award:8000,type:0},
    {award:8000,type:0},
    {award:8000,type:0},]

    console.log(JSON.stringify(s))
    let j = `[{"award":120000,"type":0},{"award":40000,"type":0},{"award":16000,"type":0},{"award":8000,"type":0},{"award":8000,"type":0},{"award":8000,"type":0}]`
    console.log(JSON.parse(j))
    let m = `{"pk":0,"ls":0}`
    console.log(JSON.parse(m))

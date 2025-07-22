# Getting Started with MISMO Expert MCP Tool

## 🚀 5-Minute Setup

### For Claude Code Users

1. **Clone and run setup**:
```bash
git clone <repository-url>
cd mismo-expert-mcp
./setup.sh
```

2. **That's it!** Start asking questions:
- "Use mismo-expert to find fields for bathrooms"
- "Ask mismo-expert to parse: 'Updated kitchen with granite counters'"
- "Query mismo-expert for required appraisal fields"

### Manual Setup (if setup.sh doesn't work)

1. **Start the container**:
```bash
docker-compose up -d
```

2. **Add to Claude Code**:
```bash
claude mcp add mismo-expert stdio "docker exec -i mismo-expert-mcp node src/server.js"
```

## 🎯 First Steps

### Test if it's working:
Ask Claude Code: "Use mismo-expert to find kitchen fields"

Expected response:
```
Found 2 fields:
- Kitchen.CabinetMaterialType (KitchenCabinetMaterialEnum)
- Kitchen.CountertopMaterialType (KitchenCountertopMaterialEnum)
```

### Try these examples:

1. **Parse property description**:
   - "Ask mismo-expert to parse: '3 bedroom, 2 bath colonial built in 2005'"

2. **Get valid values**:
   - "Query mismo-expert for valid property types"

3. **Find required fields**:
   - "Use mismo-expert to get required fields for single family appraisal"

## 🛠️ Common Issues

### "mismo-expert not found"
```bash
# Re-add the server
claude mcp remove mismo-expert
claude mcp add mismo-expert stdio "docker exec -i mismo-expert-mcp node src/server.js"
```

### Container not running
```bash
# Start it again
docker-compose up -d

# Check logs
docker logs mismo-expert-mcp
```

## 📖 What Can It Do?

The MISMO Expert knows about:
- Property fields (bedrooms, bathrooms, year built, etc.)
- Kitchen features (cabinets, countertops)
- Property types (single family, condo, townhouse)
- Required fields for appraisals
- How to parse narrative descriptions

## 🔗 Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Run tests with `node test-comprehensive.js`
- Monitor the server with `node monitor-dashboard.js`
- Explore the [query types](README.md#-available-query-types) available

## 💡 Pro Tips

1. The tool uses Docker, so it won't affect your system
2. All queries are processed locally - no external API calls
3. You can extend it by editing `src/query-engine.js`
4. Mock data is used by default (full XMI parsing available)

---

**Need help?** Check the [troubleshooting guide](README.md#-troubleshooting) or open an issue!
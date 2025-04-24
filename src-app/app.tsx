import React from "react";
import ReactDOM from "react-dom/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Container } from "./components/ui/container";

const App = () => {
  return (
    <Container>
      <h1>Hello World</h1>

      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">MyLaps</TabsTrigger>
          <TabsTrigger value="tab2">ChronoTrack</TabsTrigger>
          <TabsTrigger value="tab3">Racetek</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content for Tab 1</TabsContent>
        <TabsContent value="tab2">Content for Tab 2</TabsContent>
        <TabsContent value="tab3">Content for Tab 2</TabsContent>
      </Tabs>
    </Container>
  );
};

const root = ReactDOM.createRoot(document.getElementById("app-content") as HTMLElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
